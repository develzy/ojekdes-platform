import { Hono } from 'hono';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/permissions';
import { successResponse, errorResponse } from '../../lib/response';
import { CreatePaymentSchema, PaymentCallbackSchema } from '../../validators/payment';
import { PaymentRepository } from '../../repositories/payment.repository';
import { PaymentService } from '../../services/payment.service';
import { createSnapTransaction } from '../../lib/midtrans';
import type { Env } from '../../types/bindings';
import type { Variables } from '../../types/context';

const paymentsApp = new Hono<{ Bindings: Env; Variables: Variables }>();
const adminPayoutsApp = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Payments Routes ─────────────────────────────────────────────────────────

paymentsApp.post('/create', authenticate, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const repo = new PaymentRepository(db);

  const body = await c.req.json();
  const result = CreatePaymentSchema.safeParse(body);
  if (!result.success) {
    return errorResponse(c, 'Validasi gagal', result.error.errors, 422);
  }

  const { order_id, merchant_order_id, payment_method, gross_amount } = result.data;

  // Generate unique payment_code
  const paymentCode = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  if (payment_method === 'WALLET') {
    // WALLET payment: Debit customer wallet directly and mark payment PAID
    const wallet = await PaymentService.getWallet(user.id, db);
    if (wallet.balance < gross_amount) {
      return errorResponse(c, 'Saldo wallet tidak mencukupi', [], 400);
    }

    // Debit balance
    await repo.updateBalance(wallet.id, -gross_amount, 0, {
      reference_type: 'ORDER',
      reference_id: order_id || merchant_order_id || null,
      transaction_type: 'DEBIT',
      amount: gross_amount,
      description: `Pembayaran order ${order_id ? 'ride/courier' : 'merchant'} via Wallet`,
    });

    const paymentId = await repo.createPayment({
      order_id,
      merchant_order_id,
      payment_code: paymentCode,
      payment_method,
      gross_amount,
      fee_amount: 0,
      net_amount: gross_amount,
      status: 'PAID',
      paid_at: new Date().toISOString(),
    });

    if (order_id) {
      await db.prepare('UPDATE orders SET payment_status = "PAID", updated_at = datetime("now", "utc") WHERE id = ?')
        .bind(order_id)
        .run();
    }

    const payment = await repo.findPaymentById(paymentId);
    return successResponse(c, payment, 'Pembayaran berhasil menggunakan Wallet');
  } else if (payment_method === 'CASH') {
    // CASH payment: Create PENDING payment transaction
    const paymentId = await repo.createPayment({
      order_id,
      merchant_order_id,
      payment_code: paymentCode,
      payment_method,
      gross_amount,
      fee_amount: 0,
      net_amount: gross_amount,
      status: 'PENDING',
    });

    const payment = await repo.findPaymentById(paymentId);
    return successResponse(c, payment, 'Pembayaran tunai tercatat (PENDING)');
  } else {
    // Midtrans Snap payments (QRIS, BANK_TRANSFER, GOPAY, SHOPEEPAY)
    try {
      const snapResult = await createSnapTransaction(
        {
          transaction_details: {
            order_id: paymentCode,
            gross_amount,
          },
        },
        c.env
      );

      const paymentId = await repo.createPayment({
        order_id,
        merchant_order_id,
        payment_code: paymentCode,
        payment_method,
        gross_amount,
        fee_amount: 0,
        net_amount: gross_amount,
        status: 'PENDING',
        snap_token: snapResult.token,
        redirect_url: snapResult.redirect_url,
      });

      const payment = await repo.findPaymentById(paymentId);
      return successResponse(c, { payment, snap: snapResult }, 'Snap token berhasil dibuat');
    } catch (err: any) {
      return errorResponse(c, `Gagal membuat Snap token: ${err.message}`, [], 500);
    }
  }
});

paymentsApp.post('/webhook', async (c) => {
  const body = await c.req.json();
  const result = PaymentCallbackSchema.safeParse(body);
  if (!result.success) {
    return errorResponse(c, 'Callback payload tidak valid', result.error.errors, 400);
  }

  try {
    await PaymentService.handleWebhook(result.data, c.env);
    return successResponse(c, null, 'Webhook diproses');
  } catch (err: any) {
    return errorResponse(c, `Gagal memproses webhook: ${err.message}`, [], 400);
  }
});

paymentsApp.get('/:id', authenticate, async (c) => {
  const db = c.env.DB;
  const repo = new PaymentRepository(db);
  const id = Number(c.req.param('id'));

  const payment = await repo.findPaymentById(id);
  if (!payment) {
    return errorResponse(c, 'Pembayaran tidak ditemukan', [], 404);
  }

  return successResponse(c, payment, 'Detail pembayaran ditemukan');
});

// ─── Admin Payout Routes ─────────────────────────────────────────────────────

adminPayoutsApp.get('/', authenticate, requireAdmin, async (c) => {
  const db = c.env.DB;
  const repo = new PaymentRepository(db);
  const page = Number(c.req.query('page') || '1');
  const limit = Number(c.req.query('limit') || '10');

  const payouts = await repo.listPayoutRequests(page, limit);
  return successResponse(c, payouts, 'Daftar penarikan saldo');
});

adminPayoutsApp.patch('/:id/approve', authenticate, requireAdmin, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const id = Number(c.req.param('id'));

  try {
    await PaymentService.approvePayout(id, user.id, db);
    return successResponse(c, null, 'Penarikan saldo disetujui');
  } catch (err: any) {
    return errorResponse(c, err.message, [], 400);
  }
});

adminPayoutsApp.patch('/:id/reject', authenticate, requireAdmin, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const id = Number(c.req.param('id'));

  try {
    await PaymentService.rejectPayout(id, user.id, db);
    return successResponse(c, null, 'Penarikan saldo ditolak');
  } catch (err: any) {
    return errorResponse(c, err.message, [], 400);
  }
});

adminPayoutsApp.patch('/:id/paid', authenticate, requireAdmin, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const id = Number(c.req.param('id'));

  try {
    await PaymentService.paidPayout(id, user.id, db);
    return successResponse(c, null, 'Penarikan saldo berhasil dicairkan');
  } catch (err: any) {
    return errorResponse(c, err.message, [], 400);
  }
});

export { paymentsApp as default, adminPayoutsApp };
