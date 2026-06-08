import { dbQuery, dbQueryFirst, dbRun } from '../lib/db';

// ─── DB Row Types ─────────────────────────────────────────────────────────────
// Tipe ini merepresentasikan baris asli dari tabel DB.
// Berbeda dengan shared-types/User yang merupakan API response shape.

export interface DbUser {
  id: number;
  phone: string;
  email: string | null;
  password_hash: string;
  role: 'super_admin' | 'admin' | 'operator' | 'customer' | 'driver';
  is_active: number; // SQLite: 0 | 1
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbUserProfile {
  id: number;
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserWithProfile extends DbUser {
  full_name: string | null;
  avatar_url: string | null;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class UserRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Cari user berdasarkan ID, beserta profile-nya.
   */
  async findById(id: number): Promise<DbUserWithProfile | null> {
    return dbQueryFirst<DbUserWithProfile>(
      this.db,
      `SELECT u.*, up.full_name, up.avatar_url
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [id],
    );
  }

  /**
   * Cari user berdasarkan nomor telepon.
   */
  async findByPhone(phone: string): Promise<DbUser | null> {
    return dbQueryFirst<DbUser>(
      this.db,
      `SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL LIMIT 1`,
      [phone],
    );
  }

  /**
   * Cari user berdasarkan email.
   */
  async findByEmail(email: string): Promise<DbUser | null> {
    return dbQueryFirst<DbUser>(
      this.db,
      `SELECT * FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
      [email],
    );
  }

  /**
   * Buat user baru. Returns ID user yang baru dibuat.
   */
  async create(data: {
    phone: string;
    email?: string | null;
    password_hash: string;
    role: string;
  }): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO users (phone, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      [data.phone, data.email ?? null, data.password_hash, data.role],
    );
    return result.meta.last_row_id as number;
  }

  /**
   * Buat profil user. Dipanggil setelah `create()`.
   */
  async createProfile(
    userId: number,
    fullName: string,
    avatarUrl?: string | null,
  ): Promise<void> {
    await dbRun(
      this.db,
      `INSERT INTO user_profiles (user_id, full_name, avatar_url) VALUES (?, ?, ?)`,
      [userId, fullName, avatarUrl ?? null],
    );
  }

  /**
   * Update field user yang diizinkan.
   */
  async update(
    id: number,
    data: Partial<{ email: string | null; is_active: number }>,
  ): Promise<void> {
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.email !== undefined) {
      fields.push('email = ?');
      params.push(data.email);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(data.is_active);
    }

    if (fields.length === 0) return;

    fields.push(`updated_at = datetime('now', 'utc')`);
    params.push(id);

    await dbRun(
      this.db,
      `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      params,
    );
  }

  /**
   * Soft delete user (set deleted_at).
   */
  async softDelete(id: number): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE users SET deleted_at = datetime('now', 'utc'), is_active = 0 WHERE id = ?`,
      [id],
    );
  }

  /**
   * List semua user dengan pagination.
   */
  async list(
    page: number,
    limit: number,
    role?: string,
  ): Promise<{ users: DbUserWithProfile[]; total: number }> {
    const offset = (page - 1) * limit;
    const roleFilter = role ? `AND u.role = '${role}'` : '';

    const [users, countResult] = await Promise.all([
      dbQuery<DbUserWithProfile>(
        this.db,
        `SELECT u.*, up.full_name, up.avatar_url
         FROM users u
         LEFT JOIN user_profiles up ON up.user_id = u.id
         WHERE u.deleted_at IS NULL ${roleFilter}
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset],
      ),
      dbQueryFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL ${roleFilter}`,
        [],
      ),
    ]);

    return { users, total: countResult?.count ?? 0 };
  }
}
