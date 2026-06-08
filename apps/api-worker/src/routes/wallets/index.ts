import { Hono } from 'hono';
import { authenticate } from '../../middleware/auth';
import { successResponse, errorResponse } from '../../lib/response';
import { TopupWalletSchema, WithdrawWalletSchema } from '../../validators/payment';
import { PaymentRepository } from '../../repositories/payment.repository';
import { PaymentService } from '../../services/payment.service';
import type { Env } from '../../types/bindings';
import type { Variables } from '../../types/context';

const walletsApp = new Hono<{ Bindings: Env; Variables: Variables }>();

walletsApp.get('/', authenticate, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  try {
    const wallet = await PaymentService.getWallet(user.id, db);
    return successResponse(c, wallet, 'Detail dompet ditemukan');
  } catch (err: any) {
    return errorResponse(c, err.message, [], 400);
  }
});

walletsApp.get('/history', authenticate, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const page = Number(c.req.query('page') || '1');
  const limit = Number(c.req.query('limit') || '10');
  const repo = new PaymentRepository(db);

  try {
    const wallet = await PaymentService.getWallet(user.id, db);
    const history = await repo.listWalletTransactions(wallet.id, page, limit);
    return successResponse(c, history, 'Riwayat transaksi dompet');
  } catch (err: any) {
    return errorResponse(c, err.message, [], 400);
  }
});

walletsApp.post('/topup', authenticate, async (c) => {
  const user = c.get('user');

  const body = await c.req.json();
  const result = TopupWalletSchema.safeParse(body);
  if (!result.success) {
    return errorResponse(c, 'Validasi gagal', result.error.errors, 422);
  }

  try {
    const topupResult = await PaymentService.topupWallet(
      user.id,
      result.data.amount,
      result.data.payment_method,
      c.env
    );
    return successResponse(c, topupResult, 'Topup wallet berhasil dibuat');
  } catch (err: any) {
    return errorResponse(c, err.message, [], 400);
  }
});

walletsApp.post('/withdraw', authenticate, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const body = await c.req.json();
  const result = WithdrawWalletSchema.safeParse(body);
  if (!result.success) {
    return errorResponse(c, 'Validasi gagal', result.error.errors, 422);
  }

  try {
    const payout = await PaymentService.withdrawWallet(
      user.id,
      result.data.amount,
      result.data.bank_account_id,
      db
    );
    return successResponse(c, payout, 'Pengajuan penarikan saldo berhasil dibuat');
  } catch (err: any) {
    return errorResponse(c, err.message, [], 400);
  }
});

export default walletsApp;
