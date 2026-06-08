import {
  buildCreateSessionSQL,
  buildDeleteSessionByUserSQL,
  buildDeleteSessionByTokenSQL,
  buildFindSessionByTokenSQL,
} from '@ojekdes/shared-auth';
import { dbQueryFirst, dbRun } from '../lib/db';

// ─── DB Row Type ──────────────────────────────────────────────────────────────

export interface DbSession {
  id: number;
  user_id: number;
  refresh_token_hash: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class SessionRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Simpan session baru ke DB.
   * Menggunakan SQL builder dari @ojekdes/shared-auth.
   * Returns ID session yang baru dibuat.
   */
  async create(
    userId: number,
    refreshTokenHash: string,
    expiresAt: string,
  ): Promise<number> {
    const { sql, params } = buildCreateSessionSQL(userId, refreshTokenHash, expiresAt);
    const result = await dbRun(this.db, sql, params);
    return result.meta.last_row_id as number;
  }

  /**
   * Cari session berdasarkan refresh token hash.
   * Hanya mengembalikan session yang belum expired.
   */
  async findByTokenHash(hash: string): Promise<DbSession | null> {
    const { sql, params } = buildFindSessionByTokenSQL(hash);
    return dbQueryFirst<DbSession>(this.db, sql, params);
  }

  /**
   * Hapus SEMUA session milik user (digunakan saat logout).
   */
  async deleteByUserId(userId: number): Promise<void> {
    const { sql, params } = buildDeleteSessionByUserSQL(userId);
    await dbRun(this.db, sql, params);
  }

  /**
   * Hapus session spesifik berdasarkan token hash (digunakan saat token rotation).
   */
  async deleteByTokenHash(hash: string): Promise<void> {
    const { sql, params } = buildDeleteSessionByTokenSQL(hash);
    await dbRun(this.db, sql, params);
  }

  /**
   * Hapus semua session yang sudah expired (maintenance task).
   */
  async deleteExpired(): Promise<void> {
    await dbRun(
      this.db,
      `DELETE FROM sessions WHERE expires_at <= datetime('now', 'utc')`,
      [],
    );
  }
}
