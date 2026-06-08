import { dbQuery, dbQueryFirst, dbRun } from '../lib/db';
import type {
  Order,
  OrderTracking,
  OrderStatusHistory,
  DriverAssignment,
  OrderCancellation,
  OrderRating,
  OrderProof,
  OrderDetail,
} from '@ojekdes/shared-types';

// ─── Helper ───────────────────────────────────────────────────────────────────

function generateOrderNumber(serviceType: string): string {
  const prefix = serviceType === 'RIDE' ? 'RD' : serviceType === 'COURIER' ? 'CR' : 'MR';
  const date   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand   = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${date}-${rand}`;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class OrderRepository {
  constructor(private readonly db: D1Database) {}

  // ─── Read ──────────────────────────────────────────────────────────────────

  async findById(id: number): Promise<Order | null> {
    return dbQueryFirst<Order>(
      this.db,
      `SELECT * FROM orders WHERE id = ? LIMIT 1`,
      [id],
    );
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return dbQueryFirst<Order>(
      this.db,
      `SELECT * FROM orders WHERE order_number = ? LIMIT 1`,
      [orderNumber],
    );
  }

  /**
   * Ambil order detail lengkap: order + history + tracking + assignment + cancellation + rating + proofs.
   */
  async findDetailById(id: number): Promise<OrderDetail | null> {
    const [order, history, tracking, assignment, cancellation, rating, proofs] = await Promise.all([
      dbQueryFirst<Order>(this.db, `SELECT * FROM orders WHERE id = ? LIMIT 1`, [id]),
      dbQuery<OrderStatusHistory>(this.db, `SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC`, [id]),
      dbQuery<OrderTracking>(this.db, `SELECT * FROM order_tracking WHERE order_id = ? ORDER BY recorded_at DESC LIMIT 20`, [id]),
      dbQueryFirst<DriverAssignment>(this.db, `SELECT * FROM driver_assignments WHERE order_id = ? ORDER BY assigned_at DESC LIMIT 1`, [id]),
      dbQueryFirst<OrderCancellation>(this.db, `SELECT * FROM order_cancellations WHERE order_id = ? LIMIT 1`, [id]),
      dbQueryFirst<OrderRating>(this.db, `SELECT * FROM order_ratings WHERE order_id = ? LIMIT 1`, [id]),
      dbQuery<OrderProof>(this.db, `SELECT * FROM order_proofs WHERE order_id = ? ORDER BY created_at ASC`, [id]),
    ]);

    if (!order) return null;

    return {
      ...order,
      status_history: history,
      tracking,
      assignment: assignment ?? null,
      cancellation: cancellation ?? null,
      rating: rating ?? null,
      proofs,
    };
  }

  // ─── Create Order ──────────────────────────────────────────────────────────

  async createOrder(data: {
    service_type: string;
    customer_id: number;
    pickup_name?: string | null;
    pickup_phone?: string | null;
    pickup_address: string;
    pickup_latitude: number;
    pickup_longitude: number;
    destination_name?: string | null;
    destination_phone?: string | null;
    destination_address: string;
    destination_latitude: number;
    destination_longitude: number;
    distance_km: number;
    duration_minutes: number;
    estimated_price: number;
    payment_method: string;
    merchant_id?: number | null;
    merchant_order_id?: number | null;
    notes?: string | null;
  }): Promise<number> {
    const orderNumber = generateOrderNumber(data.service_type);

    const result = await dbRun(
      this.db,
      `INSERT INTO orders (
        order_number, customer_id, service_type,
        pickup_name, pickup_phone, pickup_address, pickup_latitude, pickup_longitude,
        destination_name, destination_phone, destination_address,
        destination_latitude, destination_longitude,
        distance_km, duration_minutes, estimated_price, final_price,
        payment_method, merchant_id, merchant_order_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        data.customer_id,
        data.service_type,
        data.pickup_name ?? null,
        data.pickup_phone ?? null,
        data.pickup_address,
        data.pickup_latitude,
        data.pickup_longitude,
        data.destination_name ?? null,
        data.destination_phone ?? null,
        data.destination_address,
        data.destination_latitude,
        data.destination_longitude,
        data.distance_km,
        data.duration_minutes,
        data.estimated_price,
        data.estimated_price, // final_price starts same as estimated
        data.payment_method,
        data.merchant_id ?? null,
        data.merchant_order_id ?? null,
        data.notes ?? null,
      ],
    );

    return result.meta.last_row_id as number;
  }

  // ─── Update Status ─────────────────────────────────────────────────────────

  async updateStatus(
    id: number,
    newStatus: string,
    changedBy: number | null,
    notes?: string | null,
  ): Promise<void> {
    const current = await this.findById(id);
    const oldStatus = current?.status ?? null;

    await Promise.all([
      dbRun(
        this.db,
        `UPDATE orders SET status = ?, updated_at = datetime('now', 'utc') WHERE id = ?`,
        [newStatus, id],
      ),
      dbRun(
        this.db,
        `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [id, oldStatus, newStatus, changedBy, notes ?? null],
      ),
    ]);
  }

  async updateFinalPrice(id: number, finalPrice: number): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE orders SET final_price = ?, updated_at = datetime('now', 'utc') WHERE id = ?`,
      [finalPrice, id],
    );
  }

  async updatePaymentStatus(id: number, paymentStatus: string): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE orders SET payment_status = ?, updated_at = datetime('now', 'utc') WHERE id = ?`,
      [paymentStatus, id],
    );
  }

  async setDriver(orderId: number, driverId: number): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE orders SET driver_id = ?, updated_at = datetime('now', 'utc') WHERE id = ?`,
      [driverId, orderId],
    );
  }

  // ─── Tracking ──────────────────────────────────────────────────────────────

  async createTracking(data: {
    order_id: number;
    driver_id: number;
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  }): Promise<void> {
    await dbRun(
      this.db,
      `INSERT INTO order_tracking (order_id, driver_id, latitude, longitude, accuracy)
       VALUES (?, ?, ?, ?, ?)`,
      [data.order_id, data.driver_id, data.latitude, data.longitude, data.accuracy ?? null],
    );
  }

  async getLatestTracking(orderId: number): Promise<OrderTracking | null> {
    return dbQueryFirst<OrderTracking>(
      this.db,
      `SELECT * FROM order_tracking WHERE order_id = ? ORDER BY recorded_at DESC LIMIT 1`,
      [orderId],
    );
  }

  // ─── Driver Assignment ─────────────────────────────────────────────────────

  async createAssignment(orderId: number, driverId: number): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO driver_assignments (order_id, driver_id) VALUES (?, ?)`,
      [orderId, driverId],
    );
    return result.meta.last_row_id as number;
  }

  async updateAssignmentStatus(
    assignmentId: number,
    status: string,
  ): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE driver_assignments
       SET assignment_status = ?, responded_at = datetime('now', 'utc')
       WHERE id = ?`,
      [status, assignmentId],
    );
  }

  async getPendingAssignment(orderId: number, driverId: number): Promise<DriverAssignment | null> {
    return dbQueryFirst<DriverAssignment>(
      this.db,
      `SELECT * FROM driver_assignments
       WHERE order_id = ? AND driver_id = ? AND assignment_status = 'PENDING'
       LIMIT 1`,
      [orderId, driverId],
    );
  }

  // ─── Cancellation ──────────────────────────────────────────────────────────

  async cancelOrder(data: {
    order_id: number;
    cancelled_by: number;
    reason: string;
    refund_amount?: number;
  }): Promise<void> {
    await Promise.all([
      dbRun(
        this.db,
        `INSERT INTO order_cancellations (order_id, cancelled_by, reason, refund_amount)
         VALUES (?, ?, ?, ?)`,
        [data.order_id, data.cancelled_by, data.reason, data.refund_amount ?? 0],
      ),
      this.updateStatus(data.order_id, 'CANCELLED', data.cancelled_by, data.reason),
    ]);
  }

  // ─── Rating ────────────────────────────────────────────────────────────────

  async createRating(data: {
    order_id: number;
    customer_id: number;
    driver_id: number;
    rating: number;
    review?: string | null;
  }): Promise<void> {
    await dbRun(
      this.db,
      `INSERT INTO order_ratings (order_id, customer_id, driver_id, rating, review)
       VALUES (?, ?, ?, ?, ?)`,
      [data.order_id, data.customer_id, data.driver_id, data.rating, data.review ?? null],
    );
  }

  // ─── Proof ─────────────────────────────────────────────────────────────────

  async uploadProof(data: {
    order_id: number;
    proof_type: string;
    image_url: string;
    uploaded_by: number;
  }): Promise<void> {
    await dbRun(
      this.db,
      `INSERT INTO order_proofs (order_id, proof_type, image_url, uploaded_by)
       VALUES (?, ?, ?, ?)`,
      [data.order_id, data.proof_type, data.image_url, data.uploaded_by],
    );
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  async listOrders(
    page: number,
    limit: number,
    status?: string,
    serviceType?: string,
    customerId?: number,
    driverId?: number,
    merchantId?: number,
  ): Promise<{ orders: Order[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (status)      { conditions.push('status = ?');       params.push(status); }
    if (serviceType) { conditions.push('service_type = ?'); params.push(serviceType); }
    if (customerId)  { conditions.push('customer_id = ?');  params.push(customerId); }
    if (driverId)    { conditions.push('driver_id = ?');    params.push(driverId); }
    if (merchantId)  { conditions.push('merchant_id = ?');  params.push(merchantId); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [orders, countResult] = await Promise.all([
      dbQuery<Order>(
        this.db,
        `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
      dbQueryFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM orders ${where}`,
        params,
      ),
    ]);

    return { orders, total: countResult?.count ?? 0 };
  }
}
