import { dbQuery, dbQueryFirst, dbRun } from '../lib/db';

// ─── DB Row Types ─────────────────────────────────────────────────────────────

export interface DbCustomer {
  id: number;
  user_id: number;
  student_card_url: string | null;
  is_verified_student: number; // SQLite: 0 | 1
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbCustomerWithDetails extends DbCustomer {
  // User info
  phone: string;
  email: string | null;
  is_active: number;
  // Profile info
  full_name: string | null;
  avatar_url: string | null;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class CustomerRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Cari customer berdasarkan ID.
   */
  async findById(id: number): Promise<DbCustomerWithDetails | null> {
    return dbQueryFirst<DbCustomerWithDetails>(
      this.db,
      `SELECT c.*,
              u.phone, u.email, u.is_active,
              up.full_name, up.avatar_url
       FROM customers c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN user_profiles up ON up.user_id = c.user_id
       WHERE c.id = ? AND c.deleted_at IS NULL
       LIMIT 1`,
      [id],
    );
  }

  /**
   * Cari customer berdasarkan user_id.
   */
  async findByUserId(userId: number): Promise<DbCustomerWithDetails | null> {
    return dbQueryFirst<DbCustomerWithDetails>(
      this.db,
      `SELECT c.*,
              u.phone, u.email, u.is_active,
              up.full_name, up.avatar_url
       FROM customers c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN user_profiles up ON up.user_id = c.user_id
       WHERE c.user_id = ? AND c.deleted_at IS NULL
       LIMIT 1`,
      [userId],
    );
  }

  /**
   * Buat customer record baru.
   */
  async create(userId: number): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO customers (user_id) VALUES (?)`,
      [userId],
    );
    return result.meta.last_row_id as number;
  }

  /**
   * List semua customer dengan pagination.
   */
  async list(
    page: number,
    limit: number,
  ): Promise<{ customers: DbCustomerWithDetails[]; total: number }> {
    const offset = (page - 1) * limit;

    const [customers, countResult] = await Promise.all([
      dbQuery<DbCustomerWithDetails>(
        this.db,
        `SELECT c.*,
                u.phone, u.email, u.is_active,
                up.full_name, up.avatar_url
         FROM customers c
         JOIN users u ON u.id = c.user_id
         LEFT JOIN user_profiles up ON up.user_id = c.user_id
         WHERE c.deleted_at IS NULL
         ORDER BY c.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset],
      ),
      dbQueryFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL`,
        [],
      ),
    ]);

    return { customers, total: countResult?.count ?? 0 };
  }
}
