import { dbQuery, dbQueryFirst, dbRun } from '../lib/db';
import type {
  Wallet,
  WalletTransaction,
  PaymentTransaction,
  Settlement,
  MerchantSettlement,
  PayoutRequest,
  RefundTransaction
} from '@ojekdes/shared-types';

export class PaymentRepository {
  constructor(private readonly db: D1Database) {}

  // ─── Wallet ──────────────────────────────────────────────────────────────────

  async createWallet(userId: number): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO wallets (user_id, balance, hold_balance) VALUES (?, 0, 0)`,
      [userId]
    );
    return result.meta.last_row_id as number;
  }

  async findWalletByUserId(userId: number): Promise<Wallet | null> {
    return dbQueryFirst<Wallet>(
      this.db,
      `SELECT * FROM wallets WHERE user_id = ? LIMIT 1`,
      [userId]
    );
  }

  async findWalletById(walletId: number): Promise<Wallet | null> {
    return dbQueryFirst<Wallet>(
      this.db,
      `SELECT * FROM wallets WHERE id = ? LIMIT 1`,
      [walletId]
    );
  }

  async updateBalance(
    walletId: number,
    balanceChange: number,
    holdBalanceChange: number,
    ledger?: {
      reference_type: 'ORDER' | 'TOPUP' | 'WITHDRAW' | 'SETTLEMENT' | 'BONUS' | 'REFUND';
      reference_id?: number | null;
      transaction_type: 'CREDIT' | 'DEBIT';
      amount: number;
      description?: string | null;
    }
  ): Promise<void> {
    const wallet = await this.findWalletById(walletId);
    if (!wallet) {
      throw new Error(`Wallet dengan ID ${walletId} tidak ditemukan`);
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + balanceChange;

    const statements: D1PreparedStatement[] = [];

    // 1. Update wallet balance
    statements.push(
      this.db.prepare(
        `UPDATE wallets
         SET balance = balance + ?,
             hold_balance = hold_balance + ?,
             updated_at = datetime('now', 'utc')
         WHERE id = ?`
      ).bind(balanceChange, holdBalanceChange, walletId)
    );

    // 2. Insert ledger if provided
    if (ledger) {
      statements.push(
        this.db.prepare(
          `INSERT INTO wallet_transactions
             (wallet_id, reference_type, reference_id, transaction_type, amount, balance_before, balance_after, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          walletId,
          ledger.reference_type,
          ledger.reference_id ?? null,
          ledger.transaction_type,
          ledger.amount,
          balanceBefore,
          balanceAfter,
          ledger.description ?? null
        )
      );
    }

    await this.db.batch(statements);
  }

  // ─── Ledger (Wallet Transactions) ───────────────────────────────────────────

  async createWalletTransaction(data: {
    wallet_id: number;
    reference_type: 'ORDER' | 'TOPUP' | 'WITHDRAW' | 'SETTLEMENT' | 'BONUS' | 'REFUND';
    reference_id?: number | null;
    transaction_type: 'CREDIT' | 'DEBIT';
    amount: number;
    balance_before: number;
    balance_after: number;
    description?: string | null;
  }): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO wallet_transactions
         (wallet_id, reference_type, reference_id, transaction_type, amount, balance_before, balance_after, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.wallet_id,
        data.reference_type,
        data.reference_id ?? null,
        data.transaction_type,
        data.amount,
        data.balance_before,
        data.balance_after,
        data.description ?? null
      ]
    );
    return result.meta.last_row_id as number;
  }

  async listWalletTransactions(walletId: number, page: number, limit: number): Promise<WalletTransaction[]> {
    const offset = (page - 1) * limit;
    return dbQuery<WalletTransaction>(
      this.db,
      `SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`,
      [walletId, limit, offset]
    );
  }

  // ─── Payment Transactions ────────────────────────────────────────────────────

  async createPayment(data: {
    order_id?: number | null;
    merchant_order_id?: number | null;
    payment_code: string;
    payment_method: 'CASH' | 'WALLET' | 'QRIS' | 'BANK_TRANSFER' | 'GOPAY' | 'SHOPEEPAY';
    gross_amount: number;
    fee_amount: number;
    net_amount: number;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
    snap_token?: string | null;
    redirect_url?: string | null;
    paid_at?: string | null;
  }): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO payment_transactions
         (order_id, merchant_order_id, payment_code, payment_method, gross_amount, fee_amount, net_amount, status, snap_token, redirect_url, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.order_id ?? null,
        data.merchant_order_id ?? null,
        data.payment_code,
        data.payment_method,
        data.gross_amount,
        data.fee_amount,
        data.net_amount,
        data.status,
        data.snap_token ?? null,
        data.redirect_url ?? null,
        data.paid_at ?? null
      ]
    );
    return result.meta.last_row_id as number;
  }

  async updatePaymentStatus(id: number, status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED', midtransTransactionId?: string | null, paidAt?: string | null): Promise<void> {
    const fields: string[] = ['status = ?', 'updated_at = datetime("now", "utc")'];
    const params: (string | number | null)[] = [status];

    if (midtransTransactionId !== undefined) {
      fields.push('midtrans_transaction_id = ?');
      params.push(midtransTransactionId);
    }
    if (paidAt !== undefined) {
      fields.push('paid_at = ?');
      params.push(paidAt);
    }

    params.push(id);

    await dbRun(
      this.db,
      `UPDATE payment_transactions SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
  }

  async findPaymentByCode(code: string): Promise<PaymentTransaction | null> {
    return dbQueryFirst<PaymentTransaction>(
      this.db,
      `SELECT * FROM payment_transactions WHERE payment_code = ? LIMIT 1`,
      [code]
    );
  }

  async findPaymentById(id: number): Promise<PaymentTransaction | null> {
    return dbQueryFirst<PaymentTransaction>(
      this.db,
      `SELECT * FROM payment_transactions WHERE id = ? LIMIT 1`,
      [id]
    );
  }

  // ─── Settlement ──────────────────────────────────────────────────────────────

  async createSettlement(data: {
    driver_id: number;
    order_id: number;
    gross_amount: number;
    platform_fee: number;
    net_amount: number;
    status: 'PENDING' | 'SETTLED' | 'FAILED';
    settled_at?: string | null;
  }): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO settlements (driver_id, order_id, gross_amount, platform_fee, net_amount, status, settled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.driver_id,
        data.order_id,
        data.gross_amount,
        data.platform_fee,
        data.net_amount,
        data.status,
        data.settled_at ?? null
      ]
    );
    return result.meta.last_row_id as number;
  }

  async findSettlementByOrderId(orderId: number): Promise<Settlement | null> {
    return dbQueryFirst<Settlement>(
      this.db,
      `SELECT * FROM settlements WHERE order_id = ? LIMIT 1`,
      [orderId]
    );
  }

  async createMerchantSettlement(data: {
    merchant_id: number;
    merchant_order_id: number;
    gross_amount: number;
    platform_fee: number;
    net_amount: number;
    status: 'PENDING' | 'SETTLED' | 'FAILED';
    settled_at?: string | null;
    created_by_payment_id?: number | null;
  }): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO merchant_settlements
         (merchant_id, merchant_order_id, gross_amount, platform_fee, net_amount, status, settled_at, created_by_payment_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.merchant_id,
        data.merchant_order_id,
        data.gross_amount,
        data.platform_fee,
        data.net_amount,
        data.status,
        data.settled_at ?? null,
        data.created_by_payment_id ?? null
      ]
    );
    return result.meta.last_row_id as number;
  }

  async findMerchantSettlementByOrderId(merchantOrderId: number): Promise<MerchantSettlement | null> {
    return dbQueryFirst<MerchantSettlement>(
      this.db,
      `SELECT * FROM merchant_settlements WHERE merchant_order_id = ? LIMIT 1`,
      [merchantOrderId]
    );
  }

  // ─── Refund ──────────────────────────────────────────────────────────────────

  async createRefund(data: {
    payment_id: number;
    amount: number;
    reason?: string | null;
  }): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO refund_transactions (payment_id, amount, reason) VALUES (?, ?, ?)`,
      [data.payment_id, data.amount, data.reason ?? null]
    );
    return result.meta.last_row_id as number;
  }

  async findRefundsByPaymentId(paymentId: number): Promise<RefundTransaction[]> {
    return dbQuery<RefundTransaction>(
      this.db,
      `SELECT * FROM refund_transactions WHERE payment_id = ? ORDER BY created_at DESC`,
      [paymentId]
    );
  }

  // ─── Payout Requests (Withdrawals) ───────────────────────────────────────────

  async createPayoutRequest(data: {
    user_id: number;
    wallet_id: number;
    amount: number;
    bank_account_id: number;
  }): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO payout_requests (user_id, wallet_id, amount, bank_account_id, status)
       VALUES (?, ?, ?, ?, 'PENDING')`,
      [data.user_id, data.wallet_id, data.amount, data.bank_account_id]
    );
    return result.meta.last_row_id as number;
  }

  async findPayoutById(id: number): Promise<PayoutRequest | null> {
    return dbQueryFirst<PayoutRequest>(
      this.db,
      `SELECT * FROM payout_requests WHERE id = ? LIMIT 1`,
      [id]
    );
  }

  async listPayoutRequests(page: number, limit: number): Promise<PayoutRequest[]> {
    const offset = (page - 1) * limit;
    return dbQuery<PayoutRequest>(
      this.db,
      `SELECT * FROM payout_requests ORDER BY requested_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }

  async approvePayout(id: number, processedBy: number): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE payout_requests
       SET status = 'APPROVED', processed_by = ?, processed_at = datetime('now', 'utc')
       WHERE id = ?`,
      [processedBy, id]
    );
  }

  async rejectPayout(id: number, processedBy: number): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE payout_requests
       SET status = 'REJECTED', processed_by = ?, processed_at = datetime('now', 'utc')
       WHERE id = ?`,
      [processedBy, id]
    );
  }

  async paidPayout(id: number, processedBy: number): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE payout_requests
       SET status = 'PAID', processed_by = ?, processed_at = datetime('now', 'utc')
       WHERE id = ?`,
      [processedBy, id]
    );
  }
}
