import { dbQuery, dbQueryFirst, dbRun } from '../lib/db';
import type { MerchantOrder, MerchantOrderItem, MerchantOrderWithItems } from '@ojekdes/shared-types';

// ─── Helper ───────────────────────────────────────────────────────────────────

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `MO-${date}-${random}`;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class MerchantOrderRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Ambil order beserta item-nya.
   */
  async findById(id: number): Promise<MerchantOrderWithItems | null> {
    const [order, items] = await Promise.all([
      dbQueryFirst<MerchantOrder>(
        this.db,
        `SELECT * FROM merchant_orders WHERE id = ? LIMIT 1`,
        [id],
      ),
      dbQuery<MerchantOrderItem>(
        this.db,
        `SELECT * FROM merchant_order_items WHERE merchant_order_id = ?`,
        [id],
      ),
    ]);

    if (!order) return null;
    return { ...order, items };
  }

  /**
   * Ambil order berdasarkan order_number.
   */
  async findByOrderNumber(orderNumber: string): Promise<MerchantOrder | null> {
    return dbQueryFirst<MerchantOrder>(
      this.db,
      `SELECT * FROM merchant_orders WHERE order_number = ? LIMIT 1`,
      [orderNumber],
    );
  }

  /**
   * Buat order + items dalam satu batch.
   * Returns ID order baru.
   */
  async create(
    data: {
      customer_id: number;
      merchant_id: number;
      branch_id?: number | null;
      subtotal: number;
      delivery_fee: number;
      total_amount: number;
      notes?: string | null;
    },
    items: Array<{
      product_id: number;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>,
  ): Promise<number> {
    const orderNumber = generateOrderNumber();

    const orderResult = await dbRun(
      this.db,
      `INSERT INTO merchant_orders
         (order_number, customer_id, merchant_id, branch_id, subtotal, delivery_fee, total_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        data.customer_id,
        data.merchant_id,
        data.branch_id ?? null,
        data.subtotal,
        data.delivery_fee,
        data.total_amount,
        data.notes ?? null,
      ],
    );

    const orderId = orderResult.meta.last_row_id as number;

    // Insert semua items
    for (const item of items) {
      await dbRun(
        this.db,
        `INSERT INTO merchant_order_items (merchant_order_id, product_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, item.unit_price, item.total_price],
      );
    }

    return orderId;
  }

  /**
   * Update status order.
   */
  async updateStatus(id: number, status: string): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE merchant_orders SET status = ?, updated_at = datetime('now', 'utc') WHERE id = ?`,
      [status, id],
    );
  }

  /**
   * Assign driver ke order.
   */
  async assignDriver(orderId: number, driverId: number): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE merchant_orders SET driver_id = ?, updated_at = datetime('now', 'utc') WHERE id = ?`,
      [driverId, orderId],
    );
  }

  /**
   * List order dengan pagination dan filter.
   */
  async list(
    page: number,
    limit: number,
    merchantId?: number,
    customerId?: number,
    driverId?: number,
    status?: string,
  ): Promise<{ orders: MerchantOrder[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (merchantId !== undefined) { conditions.push('merchant_id = ?'); params.push(merchantId); }
    if (customerId !== undefined) { conditions.push('customer_id = ?'); params.push(customerId); }
    if (driverId   !== undefined) { conditions.push('driver_id = ?');   params.push(driverId); }
    if (status)                   { conditions.push('status = ?');       params.push(status); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [orders, countResult] = await Promise.all([
      dbQuery<MerchantOrder>(
        this.db,
        `SELECT * FROM merchant_orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
      dbQueryFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM merchant_orders ${where}`,
        params,
      ),
    ]);

    return { orders, total: countResult?.count ?? 0 };
  }
}
