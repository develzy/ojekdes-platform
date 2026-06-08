import { dbQuery, dbQueryFirst, dbRun } from '../lib/db';

// ─── DB Row Types ─────────────────────────────────────────────────────────────

export interface DbPayment {
  id: number;
  order_id: number;
  payment_method: 'CASH' | 'QRIS';
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'EXPIRED';
  midtrans_payment_type: string | null;
  midtrans_transaction_id: string | null;
  midtrans_order_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class PaymentRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Cari payment berdasarkan ID.
   */
  async findById(id: number): Promise<DbPayment | null> {
    return dbQueryFirst<DbPayment>(
      this.db,
      `SELECT * FROM payments WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
  }

  /**
   * Cari payment berdasarkan order_id.
   */
  async findByOrderId(orderId: number): Promise<DbPayment | null> {
    return dbQueryFirst<DbPayment>(
      this.db,
      `SELECT * FROM payments WHERE order_id = ? AND deleted_at IS NULL LIMIT 1`,
      [orderId],
    );
  }

  /**
   * Buat payment record baru.
   */
  async create(
    orderId: number,
    paymentMethod: string,
    amount: number,
  ): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO payments (order_id, payment_method, amount, status) VALUES (?, ?, ?, 'PENDING')`,
      [orderId, paymentMethod, amount],
    );
    return result.meta.last_row_id as number;
  }

  /**
   * Update status payment.
   */
  async updateStatus(
    id: number,
    status: string,
    extra?: {
      midtrans_payment_type?: string;
      midtrans_transaction_id?: string;
      paid_at?: string;
    },
  ): Promise<void> {
    const fields = [`status = ?`, `updated_at = datetime('now', 'utc')`];
    const params: (string | number | null)[] = [status];

    if (extra?.midtrans_payment_type) {
      fields.push('midtrans_payment_type = ?');
      params.push(extra.midtrans_payment_type);
    }
    if (extra?.midtrans_transaction_id) {
      fields.push('midtrans_transaction_id = ?');
      params.push(extra.midtrans_transaction_id);
    }
    if (status === 'PAID') {
      fields.push(`paid_at = datetime('now', 'utc')`);
    }

    params.push(id);
    await dbRun(
      this.db,
      `UPDATE payments SET ${fields.join(', ')} WHERE id = ?`,
      params,
    );
  }

  /**
   * List payment dengan pagination.
   */
  async list(
    page: number,
    limit: number,
    status?: string,
  ): Promise<{ payments: DbPayment[]; total: number }> {
    const offset = (page - 1) * limit;
    const statusFilter = status ? `AND status = '${status}'` : '';

    const [payments, countResult] = await Promise.all([
      dbQuery<DbPayment>(
        this.db,
        `SELECT * FROM payments WHERE deleted_at IS NULL ${statusFilter}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset],
      ),
      dbQueryFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM payments WHERE deleted_at IS NULL ${statusFilter}`,
        [],
      ),
    ]);

    return { payments, total: countResult?.count ?? 0 };
  }
}
