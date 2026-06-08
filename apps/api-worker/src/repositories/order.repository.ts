import { dbQuery, dbQueryFirst, dbRun } from '../lib/db';

// ─── DB Row Types ─────────────────────────────────────────────────────────────

export interface DbOrder {
  id: number;
  order_code: string;
  customer_id: number;
  driver_id: number | null;
  service_type: 'MOTOR' | 'BENTOR' | 'PELAJAR';
  status: 'PENDING' | 'SEARCHING_DRIVER' | 'DRIVER_ACCEPTED' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  distance: number;
  fare: number;
  platform_fee: number;
  net_fare: number;
  discount: number;
  surcharge: number;
  payment_method: 'CASH' | 'QRIS';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbOrderWithLocation extends DbOrder {
  pickup_address: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  dropoff_address: string | null;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
}

export interface CreateOrderData {
  order_code: string;
  customer_id: number;
  service_type: string;
  distance: number;
  fare: number;
  platform_fee: number;
  net_fare: number;
  discount?: number;
  surcharge?: number;
  payment_method: string;
}

export interface CreateOrderLocationData {
  order_id: number;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_village_id: number;
  dropoff_address: string;
  dropoff_latitude: number;
  dropoff_longitude: number;
  dropoff_village_id: number;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class OrderRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Cari order berdasarkan ID, beserta informasi lokasi.
   */
  async findById(id: number): Promise<DbOrderWithLocation | null> {
    return dbQueryFirst<DbOrderWithLocation>(
      this.db,
      `SELECT o.*,
              ol.pickup_address, ol.pickup_latitude, ol.pickup_longitude,
              ol.dropoff_address, ol.dropoff_latitude, ol.dropoff_longitude
       FROM orders o
       LEFT JOIN order_locations ol ON ol.order_id = o.id
       WHERE o.id = ? AND o.deleted_at IS NULL
       LIMIT 1`,
      [id],
    );
  }

  /**
   * Cari order berdasarkan order_code unik.
   */
  async findByCode(orderCode: string): Promise<DbOrder | null> {
    return dbQueryFirst<DbOrder>(
      this.db,
      `SELECT * FROM orders WHERE order_code = ? AND deleted_at IS NULL LIMIT 1`,
      [orderCode],
    );
  }

  /**
   * Buat order baru.
   */
  async create(data: CreateOrderData): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO orders
         (order_code, customer_id, service_type, distance, fare, platform_fee,
          net_fare, discount, surcharge, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.order_code, data.customer_id, data.service_type,
        data.distance, data.fare, data.platform_fee, data.net_fare,
        data.discount ?? 0, data.surcharge ?? 0, data.payment_method,
      ],
    );
    return result.meta.last_row_id as number;
  }

  /**
   * Simpan lokasi order.
   */
  async createLocation(data: CreateOrderLocationData): Promise<void> {
    await dbRun(
      this.db,
      `INSERT INTO order_locations
         (order_id, pickup_address, pickup_latitude, pickup_longitude, pickup_village_id,
          dropoff_address, dropoff_latitude, dropoff_longitude, dropoff_village_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.order_id, data.pickup_address, data.pickup_latitude,
        data.pickup_longitude, data.pickup_village_id, data.dropoff_address,
        data.dropoff_latitude, data.dropoff_longitude, data.dropoff_village_id,
      ],
    );
  }

  /**
   * Update status order dan catat ke order_status_logs.
   */
  async updateStatus(id: number, status: string, notes?: string): Promise<void> {
    await Promise.all([
      dbRun(
        this.db,
        `UPDATE orders SET status = ?, updated_at = datetime('now', 'utc') WHERE id = ?`,
        [status, id],
      ),
      dbRun(
        this.db,
        `INSERT INTO order_status_logs (order_id, status, notes) VALUES (?, ?, ?)`,
        [id, status, notes ?? null],
      ),
    ]);
  }

  /**
   * Assign driver ke order.
   */
  async assignDriver(orderId: number, driverId: number): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE orders SET driver_id = ?, status = 'DRIVER_ACCEPTED',
       updated_at = datetime('now', 'utc') WHERE id = ?`,
      [driverId, orderId],
    );
  }

  /**
   * List order milik customer tertentu.
   */
  async findByCustomerId(
    customerId: number,
    page: number,
    limit: number,
  ): Promise<{ orders: DbOrderWithLocation[]; total: number }> {
    const offset = (page - 1) * limit;
    const [orders, countResult] = await Promise.all([
      dbQuery<DbOrderWithLocation>(
        this.db,
        `SELECT o.*,
                ol.pickup_address, ol.pickup_latitude, ol.pickup_longitude,
                ol.dropoff_address, ol.dropoff_latitude, ol.dropoff_longitude
         FROM orders o
         LEFT JOIN order_locations ol ON ol.order_id = o.id
         WHERE o.customer_id = ? AND o.deleted_at IS NULL
         ORDER BY o.created_at DESC
         LIMIT ? OFFSET ?`,
        [customerId, limit, offset],
      ),
      dbQueryFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM orders WHERE customer_id = ? AND deleted_at IS NULL`,
        [customerId],
      ),
    ]);
    return { orders, total: countResult?.count ?? 0 };
  }

  /**
   * List semua order dengan pagination dan filter status.
   */
  async list(
    page: number,
    limit: number,
    status?: string,
  ): Promise<{ orders: DbOrderWithLocation[]; total: number }> {
    const offset = (page - 1) * limit;
    const statusFilter = status ? `AND o.status = '${status}'` : '';

    const [orders, countResult] = await Promise.all([
      dbQuery<DbOrderWithLocation>(
        this.db,
        `SELECT o.*,
                ol.pickup_address, ol.dropoff_address
         FROM orders o
         LEFT JOIN order_locations ol ON ol.order_id = o.id
         WHERE o.deleted_at IS NULL ${statusFilter}
         ORDER BY o.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset],
      ),
      dbQueryFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM orders WHERE deleted_at IS NULL ${statusFilter}`,
        [],
      ),
    ]);
    return { orders, total: countResult?.count ?? 0 };
  }
}
