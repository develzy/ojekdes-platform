import { PaymentRepository } from '../repositories/payment.repository';
import { createSnapTransaction, getTransactionStatus, cancelTransaction } from '../lib/midtrans';
import { createAuditLog } from '../lib/audit';
import { AUDIT_ACTION, ENTITY_TYPE } from '../constants';
import { PLATFORM_CONFIG } from '@ojekdes/shared-constants';
import type { Wallet, PaymentTransaction, PayoutRequest, RefundTransaction } from '@ojekdes/shared-types';
import type { PaymentCallbackInput } from '../validators/payment';

export class PaymentService {
  // ─── Wallet ──────────────────────────────────────────────────────────────────

  static async getWallet(userId: number, db: D1Database): Promise<Wallet> {
    const repo = new PaymentRepository(db);
    let wallet = await repo.findWalletByUserId(userId);

    if (!wallet) {
      await repo.createWallet(userId);
      wallet = await repo.findWalletByUserId(userId);
      if (!wallet) {
        throw new Error('Gagal membuat atau mengambil wallet user');
      }
    }

    return wallet;
  }

  static async topupWallet(
    userId: number,
    amount: number,
    paymentMethod: 'QRIS' | 'BANK_TRANSFER' | 'GOPAY' | 'SHOPEEPAY',
    env: any
  ): Promise<{ payment: PaymentTransaction; snap?: { token: string; redirect_url: string } | null }> {
    const db = env.DB as D1Database;
    const repo = new PaymentRepository(db);

    // Format payment_code dengan userId sehingga bisa diparse di webhook jika dibutuhkan
    const paymentCode = `PAY-TOPUP-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create Snap transaction via Midtrans helper
    const snapResult = await createSnapTransaction(
      {
        transaction_details: {
          order_id: paymentCode,
          gross_amount: amount,
        },
      },
      env
    );

    // Simpan data pembayaran ke database
    const paymentId = await repo.createPayment({
      payment_code: paymentCode,
      payment_method: paymentMethod,
      gross_amount: amount,
      fee_amount: 0,
      net_amount: amount,
      status: 'PENDING',
      snap_token: snapResult.token,
      redirect_url: snapResult.redirect_url,
    });

    const payment = await repo.findPaymentById(paymentId);
    if (!payment) {
      throw new Error('Gagal mengambil data pembayaran yang baru dibuat');
    }

    await createAuditLog(db, {
      user_id: userId,
      action: AUDIT_ACTION.CREATE_PAYMENT,
      entity_type: ENTITY_TYPE.PAYMENT,
      entity_id: paymentId,
      metadata: { type: 'TOPUP', amount, payment_code: paymentCode },
    });

    return { payment, snap: snapResult };
  }

  static async withdrawWallet(
    userId: number,
    amount: number,
    bankAccountId: number,
    db: D1Database
  ): Promise<PayoutRequest> {
    const repo = new PaymentRepository(db);
    const wallet = await this.getWallet(userId, db);

    if (wallet.balance < amount) {
      throw new Error('Saldo tidak mencukupi untuk melakukan penarikan');
    }

    // 1. Kurangi balance, tambah hold_balance (tanpa ledger entry dulu)
    await repo.updateBalance(wallet.id, -amount, amount);

    // 2. Buat record payout_request
    const payoutId = await repo.createPayoutRequest({
      user_id: userId,
      wallet_id: wallet.id,
      amount,
      bank_account_id: bankAccountId,
    });

    const payout = await repo.findPayoutById(payoutId);
    if (!payout) {
      throw new Error('Gagal mengambil data penarikan yang baru dibuat');
    }

    await createAuditLog(db, {
      user_id: userId,
      action: AUDIT_ACTION.CREATE_PAYOUT,
      entity_type: ENTITY_TYPE.PAYMENT,
      entity_id: payoutId,
      metadata: { amount, bank_account_id: bankAccountId },
    });

    return payout;
  }

  // ─── Webhook Handler ─────────────────────────────────────────────────────────

  static async handleWebhook(payload: PaymentCallbackInput, env: any): Promise<void> {
    const db = env.DB as D1Database;
    const repo = new PaymentRepository(db);

    // 1. Signature key validation
    const serverKey = env.MIDTRANS_SERVER_KEY || '';
    const dataToHash = payload.order_id + payload.status_code + payload.gross_amount + serverKey;
    const encoder = new TextEncoder();
    const data = encoder.encode(dataToHash);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    if (hashHex !== payload.signature_key) {
      throw new Error('Signature key Midtrans tidak valid');
    }

    // 2. Cari payment transaction berdasarkan order_id / payment_code
    const payment = await repo.findPaymentByCode(payload.order_id);
    if (!payment) {
      throw new Error(`Transaksi pembayaran dengan kode ${payload.order_id} tidak ditemukan`);
    }

    // 3. Idempotency Check
    if (payment.status === 'PAID') {
      return; // Sudah sukses diproses sebelumnya, langsung return
    }

    const txStatus = payload.transaction_status;

    // 4. Jika status settlement / capture
    if (txStatus === 'settlement' || txStatus === 'capture') {
      // Update status pembayaran ke PAID
      const paidAt = new Date().toISOString();
      await repo.updatePaymentStatus(payment.id, 'PAID', payload.transaction_id, paidAt);

      // Jika ini adalah TOPUP (tidak terikat dengan order manapun)
      if (!payment.order_id && !payment.merchant_order_id) {
        // Parse userId dari payment_code
        let targetUserId: number | null = null;
        if (payment.payment_code.startsWith('PAY-TOPUP-')) {
          const parts = payment.payment_code.split('-');
          targetUserId = parseInt(parts[2] || '', 10);
        }

        if (targetUserId) {
          const wallet = await this.getWallet(targetUserId, db);
          // Kredit wallet customer dengan ledger
          await repo.updateBalance(wallet.id, payment.gross_amount, 0, {
            reference_type: 'TOPUP',
            reference_id: payment.id,
            transaction_type: 'CREDIT',
            amount: payment.gross_amount,
            description: `Topup saldo berhasil via ${payment.payment_method}`,
          });

          await createAuditLog(db, {
            user_id: targetUserId,
            action: AUDIT_ACTION.PAY_PAYMENT,
            entity_type: ENTITY_TYPE.PAYMENT,
            entity_id: payment.id,
            metadata: { type: 'TOPUP', amount: payment.gross_amount },
          });
        }
      } else {
        // Jika terikat order, update status pembayaran order tersebut juga (misal set order payment_status ke PAID)
        if (payment.order_id) {
          await db.prepare('UPDATE orders SET payment_status = "PAID", updated_at = datetime("now", "utc") WHERE id = ?')
            .bind(payment.order_id)
            .run();
        } else if (payment.merchant_order_id) {
          // Update status pembayaran merchant_order ke PAID? merchant_orders tidak punya field payment_status langsung, tetapi total_amount.
          // Jadi kita anggap payment_transactions.status = PAID sudah mewakili
        }
      }
    } else if (['deny', 'cancel', 'expire', 'failure'].includes(txStatus)) {
      await repo.updatePaymentStatus(payment.id, 'FAILED');

      if (payment.order_id) {
        await db.prepare('UPDATE orders SET payment_status = "FAILED", updated_at = datetime("now", "utc") WHERE id = ?')
          .bind(payment.order_id)
          .run();
      }
    }
  }

  // ─── Settlements ────────────────────────────────────────────────────────────

  static async completeOrderSettlement(orderId: number, db: D1Database): Promise<void> {
    const repo = new PaymentRepository(db);

    // Idempotency: Cek apakah sudah disettle sebelumnya
    const existing = await repo.findSettlementByOrderId(orderId);
    if (existing) return;

    // Ambil detail order
    const order = await db.prepare('SELECT * FROM orders WHERE id = ? LIMIT 1').bind(orderId).first<any>();
    if (!order) {
      throw new Error(`Order dengan ID ${orderId} tidak ditemukan`);
    }

    // Ambil detail driver
    const driver = await db.prepare('SELECT * FROM drivers WHERE id = ? LIMIT 1').bind(order.driver_id).first<any>();
    if (!driver) {
      throw new Error(`Driver untuk order ${orderId} tidak ditemukan`);
    }

    const driverWallet = await this.getWallet(driver.user_id, db);

    // Hitung tarif
    const gross = order.final_price > 0 ? order.final_price : order.estimated_price;
    const feePercent = order.service_type === 'COURIER' ? PLATFORM_CONFIG.COURIER_FEE_PERCENT : PLATFORM_CONFIG.RIDE_FEE_PERCENT;
    const platformFee = Math.round(gross * (feePercent / 100));
    const netAmount = gross - platformFee;

    if (order.payment_method === 'CASH') {
      // CASH order: Driver terima fisik, wallet didebit platform_fee
      // Cek negative balance limit
      if (driverWallet.balance - platformFee < -500000) {
        throw new Error('Batas saldo negatif driver terlampaui (-Rp500.000)');
      }

      await repo.updateBalance(driverWallet.id, -platformFee, 0, {
        reference_type: 'SETTLEMENT',
        reference_id: orderId,
        transaction_type: 'DEBIT',
        amount: platformFee,
        description: `Potongan komisi platform order tunai ${order.order_number}`,
      });
    } else {
      // WALLET atau MIDTRANS: Driver dikredit netAmount
      await repo.updateBalance(driverWallet.id, netAmount, 0, {
        reference_type: 'SETTLEMENT',
        reference_id: orderId,
        transaction_type: 'CREDIT',
        amount: netAmount,
        description: `Hasil pendapatan order non-tunai ${order.order_number}`,
      });
    }

    // Buat settlement record
    await repo.createSettlement({
      driver_id: order.driver_id,
      order_id: orderId,
      gross_amount: gross,
      platform_fee: platformFee,
      net_amount: netAmount,
      status: 'SETTLED',
      settled_at: new Date().toISOString(),
    });

    await createAuditLog(db, {
      user_id: driver.user_id,
      action: AUDIT_ACTION.CREATE_SETTLEMENT,
      entity_type: ENTITY_TYPE.ORDER,
      entity_id: orderId,
      metadata: { gross, platformFee, netAmount, method: order.payment_method },
    });
  }

  static async completeMerchantSettlement(merchantOrderId: number, db: D1Database): Promise<void> {
    const repo = new PaymentRepository(db);

    // Idempotency: Cek apakah sudah disettle sebelumnya
    const existing = await repo.findMerchantSettlementByOrderId(merchantOrderId);
    if (existing) return;

    // Ambil detail merchant order
    const mOrder = await db.prepare('SELECT * FROM merchant_orders WHERE id = ? LIMIT 1').bind(merchantOrderId).first<any>();
    if (!mOrder) {
      throw new Error(`Merchant order dengan ID ${merchantOrderId} tidak ditemukan`);
    }

    // Ambil detail merchant owner
    const merchant = await db.prepare('SELECT * FROM merchants WHERE id = ? LIMIT 1').bind(mOrder.merchant_id).first<any>();
    if (!merchant) {
      throw new Error(`Merchant dengan ID ${mOrder.merchant_id} tidak ditemukan`);
    }

    const merchantWallet = await this.getWallet(merchant.user_id, db);

    // Hitung tarif. Gross dihitung dari subtotal (harga barang)
    const gross = mOrder.subtotal;
    const platformFee = Math.round(gross * (PLATFORM_CONFIG.MERCHANT_FEE_PERCENT / 100));
    const netAmount = gross - platformFee;

    // Hubungkan dengan payment transaction jika ada
    const payment = await db.prepare('SELECT * FROM payment_transactions WHERE merchant_order_id = ? AND status = "PAID" LIMIT 1')
      .bind(merchantOrderId)
      .first<any>();

    // Kredit ke merchant wallet
    await repo.updateBalance(merchantWallet.id, netAmount, 0, {
      reference_type: 'SETTLEMENT',
      reference_id: merchantOrderId,
      transaction_type: 'CREDIT',
      amount: netAmount,
      description: `Settlement merchant order ${mOrder.order_number}`,
    });

    // Buat merchant settlement record
    await repo.createMerchantSettlement({
      merchant_id: mOrder.merchant_id,
      merchant_order_id: merchantOrderId,
      gross_amount: gross,
      platform_fee: platformFee,
      net_amount: netAmount,
      status: 'SETTLED',
      settled_at: new Date().toISOString(),
      created_by_payment_id: payment ? payment.id : null,
    });

    await createAuditLog(db, {
      user_id: merchant.user_id,
      action: AUDIT_ACTION.CREATE_SETTLEMENT,
      entity_type: ENTITY_TYPE.MERCHANT_ORDER,
      entity_id: merchantOrderId,
      metadata: { gross, platformFee, netAmount },
    });
  }

  // ─── Refund ──────────────────────────────────────────────────────────────────

  static async refundOrder(paymentId: number, amount: number, reason: string, db: D1Database): Promise<void> {
    const repo = new PaymentRepository(db);

    const payment = await repo.findPaymentById(paymentId);
    if (!payment) {
      throw new Error(`Transaksi pembayaran dengan ID ${paymentId} tidak ditemukan`);
    }

    if (payment.status !== 'PAID') {
      throw new Error('Hanya pembayaran berstatus PAID yang dapat direfund');
    }

    // Ambil customer ID.
    let targetUserId: number | null = null;
    if (payment.order_id) {
      const order = await db.prepare('SELECT customer_id FROM orders WHERE id = ? LIMIT 1').bind(payment.order_id).first<any>();
      targetUserId = order ? order.customer_id : null;
    } else if (payment.merchant_order_id) {
      const mOrder = await db.prepare('SELECT customer_id FROM merchant_orders WHERE id = ? LIMIT 1').bind(payment.merchant_order_id).first<any>();
      targetUserId = mOrder ? mOrder.customer_id : null;
    }

    if (!targetUserId) {
      throw new Error('Gagal menemukan user penerima refund');
    }

    const wallet = await this.getWallet(targetUserId, db);

    // 1. Buat refund_transaction record
    await repo.createRefund({
      payment_id: paymentId,
      amount,
      reason,
    });

    // 2. Kreditkan ke wallet customer dengan ledger log
    await repo.updateBalance(wallet.id, amount, 0, {
      reference_type: 'REFUND',
      reference_id: paymentId,
      transaction_type: 'CREDIT',
      amount,
      description: `Refund order: ${reason}`,
    });

    // 3. Update status pembayaran menjadi REFUNDED
    await repo.updatePaymentStatus(paymentId, 'REFUNDED');

    // Update status order pembayaran jika ada
    if (payment.order_id) {
      await db.prepare('UPDATE orders SET payment_status = "REFUNDED", updated_at = datetime("now", "utc") WHERE id = ?')
        .bind(payment.order_id)
        .run();
    }

    await createAuditLog(db, {
      user_id: targetUserId,
      action: AUDIT_ACTION.REFUND_PAYMENT,
      entity_type: ENTITY_TYPE.PAYMENT,
      entity_id: paymentId,
      metadata: { amount, reason },
    });
  }

  // ─── Admin Payout Management ─────────────────────────────────────────────────

  static async approvePayout(payoutId: number, adminId: number, db: D1Database): Promise<void> {
    const repo = new PaymentRepository(db);
    const payout = await repo.findPayoutById(payoutId);
    if (!payout) {
      throw new Error(`Payout request dengan ID ${payoutId} tidak ditemukan`);
    }

    if (payout.status !== 'PENDING') {
      throw new Error('Hanya payout request berstatus PENDING yang dapat disetujui');
    }

    await repo.approvePayout(payoutId, adminId);

    await createAuditLog(db, {
      user_id: adminId,
      action: AUDIT_ACTION.APPROVE_PAYOUT,
      entity_type: ENTITY_TYPE.PAYMENT,
      entity_id: payoutId,
      metadata: { payoutId },
    });
  }

  static async rejectPayout(payoutId: number, adminId: number, db: D1Database): Promise<void> {
    const repo = new PaymentRepository(db);
    const payout = await repo.findPayoutById(payoutId);
    if (!payout) {
      throw new Error(`Payout request dengan ID ${payoutId} tidak ditemukan`);
    }

    if (payout.status !== 'PENDING') {
      throw new Error('Hanya payout request berstatus PENDING yang dapat ditolak');
    }

    // Refund saldo ke balance wallet user, kurangi hold_balance (tanpa ledger entry)
    await repo.updateBalance(payout.wallet_id, payout.amount, -payout.amount);

    await repo.rejectPayout(payoutId, adminId);

    await createAuditLog(db, {
      user_id: adminId,
      action: AUDIT_ACTION.REJECT_PAYOUT,
      entity_type: ENTITY_TYPE.PAYMENT,
      entity_id: payoutId,
      metadata: { payoutId },
    });
  }

  static async paidPayout(payoutId: number, adminId: number, db: D1Database): Promise<void> {
    const repo = new PaymentRepository(db);
    const payout = await repo.findPayoutById(payoutId);
    if (!payout) {
      throw new Error(`Payout request dengan ID ${payoutId} tidak ditemukan`);
    }

    if (payout.status !== 'APPROVED') {
      throw new Error('Hanya payout request berstatus APPROVED yang dapat dicairkan (PAID)');
    }

    // Kurangi hold_balance, dan buat DEBIT ledger entry
    await repo.updateBalance(payout.wallet_id, 0, -payout.amount, {
      reference_type: 'WITHDRAW',
      reference_id: payoutId,
      transaction_type: 'DEBIT',
      amount: payout.amount,
      description: 'Pencairan saldo penarikan berhasil ditransfer',
    });

    await repo.paidPayout(payoutId, adminId);

    await createAuditLog(db, {
      user_id: adminId,
      action: AUDIT_ACTION.PAY_PAYMENT,
      entity_type: ENTITY_TYPE.PAYMENT,
      entity_id: payoutId,
      metadata: { payoutId },
    });
  }
}
