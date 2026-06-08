import { dbQuery, dbQueryFirst, dbRun } from '../lib/db';

// ─── DB Row Types ─────────────────────────────────────────────────────────────

export interface DbDriver {
  id: number;
  user_id: number;
  license_number: string;
  rating: number;
  status: 'OFFLINE' | 'ONLINE' | 'BUSY' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbDriverWithDetails extends DbDriver {
  // User info
  phone: string;
  email: string | null;
  is_active: number;
  // Profile info
  full_name: string | null;
  avatar_url: string | null;
  // Vehicle info
  plate_number: string | null;
  vehicle_type: string | null;
  brand_model: string | null;
  vehicle_photo_url: string | null;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class DriverRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Cari driver berdasarkan ID, beserta detail user dan kendaraan.
   */
  async findById(id: number): Promise<DbDriverWithDetails | null> {
    return dbQueryFirst<DbDriverWithDetails>(
      this.db,
      `SELECT d.*,
              u.phone, u.email, u.is_active,
              up.full_name, up.avatar_url,
              v.plate_number, v.vehicle_type, v.brand_model,
              v.photo_url AS vehicle_photo_url
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN user_profiles up ON up.user_id = d.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.id
       WHERE d.id = ? AND d.deleted_at IS NULL
       LIMIT 1`,
      [id],
    );
  }

  /**
   * Cari driver berdasarkan user_id.
   */
  async findByUserId(userId: number): Promise<DbDriverWithDetails | null> {
    return dbQueryFirst<DbDriverWithDetails>(
      this.db,
      `SELECT d.*,
              u.phone, u.email, u.is_active,
              up.full_name, up.avatar_url,
              v.plate_number, v.vehicle_type, v.brand_model,
              v.photo_url AS vehicle_photo_url
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN user_profiles up ON up.user_id = d.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.id
       WHERE d.user_id = ? AND d.deleted_at IS NULL
       LIMIT 1`,
      [userId],
    );
  }

  /**
   * Buat driver record baru.
   */
  async create(userId: number, licenseNumber: string): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO drivers (user_id, license_number) VALUES (?, ?)`,
      [userId, licenseNumber],
    );
    return result.meta.last_row_id as number;
  }

  /**
   * Update status driver (OFFLINE, ONLINE, BUSY, SUSPENDED).
   */
  async updateStatus(id: number, status: string): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE drivers SET status = ?, updated_at = datetime('now', 'utc') WHERE id = ?`,
      [status, id],
    );
  }

  /**
   * Update rating driver.
   */
  async updateRating(id: number, rating: number): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE drivers SET rating = ?, updated_at = datetime('now', 'utc') WHERE id = ?`,
      [rating, id],
    );
  }

  /**
   * List semua driver dengan pagination dan filter status opsional.
   */
  async list(
    page: number,
    limit: number,
    status?: string,
  ): Promise<{ drivers: DbDriverWithDetails[]; total: number }> {
    const offset = (page - 1) * limit;
    const statusFilter = status ? `AND d.status = '${status}'` : '';

    const [drivers, countResult] = await Promise.all([
      dbQuery<DbDriverWithDetails>(
        this.db,
        `SELECT d.*,
                u.phone, u.email, u.is_active,
                up.full_name, up.avatar_url,
                v.plate_number, v.vehicle_type, v.brand_model
         FROM drivers d
         JOIN users u ON u.id = d.user_id
         LEFT JOIN user_profiles up ON up.user_id = d.user_id
         LEFT JOIN vehicles v ON v.driver_id = d.id
         WHERE d.deleted_at IS NULL ${statusFilter}
         ORDER BY d.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset],
      ),
      dbQueryFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM drivers WHERE deleted_at IS NULL ${statusFilter}`,
        [],
      ),
    ]);

    return { drivers, total: countResult?.count ?? 0 };
  }
}
