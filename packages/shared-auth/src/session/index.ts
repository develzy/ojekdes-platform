import type { Session } from '@ojekdes/shared-types';

/**
 * Menghasilkan SHA-256 hash dari refresh token string.
 * Menggunakan Web Crypto API yang kompatibel dengan Node.js, Cloudflare Workers, dan browser.
 * Nilai hash ini yang disimpan di kolom `sessions.refresh_token_hash`.
 */
export async function hashRefreshToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Menghasilkan SQL INSERT untuk session baru.
 * Digunakan saat user berhasil login.
 */
export function buildCreateSessionSQL(
  userId: number,
  refreshTokenHash: string,
  expiresAt: string,
): { sql: string; params: (string | number)[] } {
  return {
    sql: `INSERT INTO sessions (user_id, refresh_token_hash, expires_at)
          VALUES (?, ?, ?)`,
    params: [userId, refreshTokenHash, expiresAt],
  };
}

/**
 * Menghasilkan SQL DELETE untuk menghapus session berdasarkan user ID.
 * Digunakan saat user logout.
 */
export function buildDeleteSessionByUserSQL(
  userId: number,
): { sql: string; params: number[] } {
  return {
    sql: `DELETE FROM sessions WHERE user_id = ?`,
    params: [userId],
  };
}

/**
 * Menghasilkan SQL DELETE untuk menghapus session tertentu berdasarkan refresh token hash.
 * Digunakan saat refresh token dirotasi (invalidate token lama).
 */
export function buildDeleteSessionByTokenSQL(
  refreshTokenHash: string,
): { sql: string; params: string[] } {
  return {
    sql: `DELETE FROM sessions WHERE refresh_token_hash = ?`,
    params: [refreshTokenHash],
  };
}

/**
 * Menghasilkan SQL SELECT untuk mencari session berdasarkan refresh token hash.
 * Digunakan saat proses refresh token.
 */
export function buildFindSessionByTokenSQL(
  refreshTokenHash: string,
): { sql: string; params: string[] } {
  return {
    sql: `SELECT * FROM sessions WHERE refresh_token_hash = ? AND expires_at > datetime('now', 'utc') LIMIT 1`,
    params: [refreshTokenHash],
  };
}

/**
 * Menghasilkan ISO timestamp kadaluarsa refresh token (30 hari dari sekarang).
 */
export function getRefreshTokenExpiry(): string {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt.toISOString().replace('T', ' ').substring(0, 19);
}
