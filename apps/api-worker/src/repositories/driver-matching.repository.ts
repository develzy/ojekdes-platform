import { dbQuery, dbQueryFirst, dbRun } from '../lib/db';
import type {
  DriverSession,
  DriverMatchingQueue,
  DriverAvailability,
} from '@ojekdes/shared-types';

export interface NearbyDriverRow {
  driver_id: number;
  is_online: number;
  current_latitude: number;
  current_longitude: number;
  last_seen_at: string;
  rating: number;
  phone: string;
  full_name: string | null;
}

export class DriverMatchingRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Update lokasi driver di driver_sessions (upsert) dan catat ke driver_locations (log).
   */
  async updateDriverLocation(
    driverId: number,
    latitude: number,
    longitude: number,
    accuracy?: number | null,
  ): Promise<void> {
    await Promise.all([
      dbRun(
        this.db,
        `INSERT INTO driver_sessions (driver_id, is_online, current_latitude, current_longitude, last_seen_at, updated_at)
         VALUES (?, 0, ?, ?, datetime('now', 'utc'), datetime('now', 'utc'))
         ON CONFLICT(driver_id) DO UPDATE SET
           current_latitude = excluded.current_latitude,
           current_longitude = excluded.current_longitude,
           last_seen_at = excluded.last_seen_at,
           updated_at = excluded.updated_at`,
        [driverId, latitude, longitude],
      ),
      dbRun(
        this.db,
        `INSERT INTO driver_locations (driver_id, latitude, longitude, accuracy)
         VALUES (?, ?, ?, ?)`,
        [driverId, latitude, longitude, accuracy ?? null],
      ),
    ]);
  }

  /**
   * Set status online driver di driver_sessions.
   */
  async setOnlineStatus(driverId: number, isOnline: boolean): Promise<void> {
    const isOnlineVal = isOnline ? 1 : 0;
    await dbRun(
      this.db,
      `INSERT INTO driver_sessions (driver_id, is_online, last_seen_at, updated_at)
       VALUES (?, ?, datetime('now', 'utc'), datetime('now', 'utc'))
       ON CONFLICT(driver_id) DO UPDATE SET
         is_online = excluded.is_online,
         last_seen_at = excluded.last_seen_at,
         updated_at = excluded.updated_at`,
      [driverId, isOnlineVal],
    );
  }

  /**
   * Cari driver online & available dalam bounding box lat/lon.
   */
  async findNearbyDrivers(
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number,
  ): Promise<NearbyDriverRow[]> {
    return dbQuery<NearbyDriverRow>(
      this.db,
      `SELECT ds.driver_id, ds.is_online, ds.current_latitude, ds.current_longitude, ds.last_seen_at,
              d.rating, u.phone, up.full_name
       FROM driver_sessions ds
       JOIN drivers d ON d.id = ds.driver_id
       JOIN users u ON u.id = d.user_id
       LEFT JOIN user_profiles up ON up.user_id = d.user_id
       LEFT JOIN driver_availability da ON da.driver_id = ds.driver_id
       WHERE ds.is_online = 1
         AND (da.is_available IS NULL OR da.is_available = 1)
         AND ds.current_latitude BETWEEN ? AND ?
         AND ds.current_longitude BETWEEN ? AND ?
         AND d.deleted_at IS NULL`,
      [minLat, maxLat, minLon, maxLon],
    );
  }

  /**
   * Masukkan list driver matching queue.
   */
  async createBroadcast(
    orderId: number,
    driverId: number,
    priority: number,
    distanceKm: number,
  ): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO driver_matching_queue (order_id, driver_id, priority, distance_km, status)
       VALUES (?, ?, ?, ?, 'PENDING')`,
      [orderId, driverId, priority, distanceKm],
    );
    return result.meta.last_row_id as number;
  }

  /**
   * Driver menyetujui assignment.
   */
  async acceptAssignment(orderId: number, driverId: number): Promise<void> {
    await Promise.all([
      // Set status queue untuk driver ini menjadi ACCEPTED
      dbRun(
        this.db,
        `UPDATE driver_matching_queue
         SET status = 'ACCEPTED', responded_at = datetime('now', 'utc')
         WHERE order_id = ? AND driver_id = ?`,
        [orderId, driverId],
      ),
      // Set status queue driver lain untuk order ini menjadi EXPIRED
      dbRun(
        this.db,
        `UPDATE driver_matching_queue
         SET status = 'EXPIRED'
         WHERE order_id = ? AND driver_id != ? AND status IN ('PENDING', 'SENT')`,
        [orderId, driverId],
      ),
      // Log history ACCEPT
      dbRun(
        this.db,
        `INSERT INTO driver_assignment_history (order_id, driver_id, action)
         VALUES (?, ?, 'ACCEPT')`,
        [orderId, driverId],
      ),
      // Set ketersediaan driver menjadi sibuk (is_available = 0)
      this.assignDriver(driverId, orderId),
    ]);
  }

  /**
   * Driver menolak assignment.
   */
  async rejectAssignment(orderId: number, driverId: number): Promise<void> {
    await Promise.all([
      dbRun(
        this.db,
        `UPDATE driver_matching_queue
         SET status = 'REJECTED', responded_at = datetime('now', 'utc')
         WHERE order_id = ? AND driver_id = ?`,
        [orderId, driverId],
      ),
      dbRun(
        this.db,
        `INSERT INTO driver_assignment_history (order_id, driver_id, action)
         VALUES (?, ?, 'REJECT')`,
        [orderId, driverId],
      ),
    ]);
  }

  /**
   * Broadcast timeout (expired).
   */
  async expireAssignment(orderId: number, driverId: number): Promise<void> {
    await Promise.all([
      dbRun(
        this.db,
        `UPDATE driver_matching_queue
         SET status = 'EXPIRED', responded_at = datetime('now', 'utc')
         WHERE order_id = ? AND driver_id = ?`,
        [orderId, driverId],
      ),
      dbRun(
        this.db,
        `INSERT INTO driver_assignment_history (order_id, driver_id, action)
         VALUES (?, ?, 'TIMEOUT')`,
        [orderId, driverId],
      ),
    ]);
  }

  /**
   * Update availability driver ke sibuk atau kosong.
   */
  async assignDriver(driverId: number, orderId: number | null): Promise<void> {
    const isAvail = orderId ? 0 : 1;
    await dbRun(
      this.db,
      `INSERT INTO driver_availability (driver_id, is_available, current_order_id, updated_at)
       VALUES (?, ?, ?, datetime('now', 'utc'))
       ON CONFLICT(driver_id) DO UPDATE SET
         is_available = excluded.is_available,
         current_order_id = excluded.current_order_id,
         updated_at = excluded.updated_at`,
      [driverId, isAvail, orderId],
    );
  }

  /**
   * Log action BROADCAST atau AUTO_ASSIGN ke assignment history.
   */
  async logHistory(orderId: number, driverId: number, action: 'BROADCAST' | 'AUTO_ASSIGN'): Promise<void> {
    await dbRun(
      this.db,
      `INSERT INTO driver_assignment_history (order_id, driver_id, action)
       VALUES (?, ?, ?)`,
      [orderId, driverId, action],
    );
  }

  /**
   * Ambil matching queue untuk order tertentu.
   */
  async getDriverQueue(orderId: number): Promise<DriverMatchingQueue[]> {
    return dbQuery<DriverMatchingQueue>(
      this.db,
      `SELECT * FROM driver_matching_queue WHERE order_id = ? ORDER BY priority ASC`,
      [orderId],
    );
  }

  /**
   * Ambil session driver tertentu.
   */
  async getSession(driverId: number): Promise<DriverSession | null> {
    return dbQueryFirst<DriverSession>(
      this.db,
      `SELECT * FROM driver_sessions WHERE driver_id = ? LIMIT 1`,
      [driverId],
    );
  }

  /**
   * Ambil status availability driver tertentu.
   */
  async getAvailability(driverId: number): Promise<DriverAvailability | null> {
    return dbQueryFirst<DriverAvailability>(
      this.db,
      `SELECT * FROM driver_availability WHERE driver_id = ? LIMIT 1`,
      [driverId],
    );
  }

  /**
   * Set matching queue status ke SENT (sent_at updated).
   */
  async markQueueSent(queueId: number): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE driver_matching_queue SET status = 'SENT', sent_at = datetime('now', 'utc') WHERE id = ?`,
      [queueId],
    );
  }
}
