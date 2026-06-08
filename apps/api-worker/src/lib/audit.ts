import { dbRun } from './db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditLogData {
  /** ID user yang melakukan aksi. null jika aksi sistem. */
  user_id: number | null;
  /** Nama aksi (login, logout, create, update, delete, dll) */
  action: string;
  /** Tipe entitas yang dioperasikan (user, order, payment, dll) */
  entity_type: string;
  /** ID entitas yang dioperasikan */
  entity_id?: number | null;
  /** Metadata tambahan dalam bentuk object */
  metadata?: Record<string, unknown>;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Membuat audit log entry di tabel `audit_logs`.
 *
 * Semua operasi penting (login, logout, create, update, delete) harus
 * memanggil helper ini untuk traceability.
 *
 * @example
 * await createAuditLog(db, {
 *   user_id: 1,
 *   action: AUDIT_ACTION.LOGIN,
 *   entity_type: ENTITY_TYPE.SESSION,
 *   metadata: { ip: '1.2.3.4' },
 * });
 */
export async function createAuditLog(db: D1Database, data: AuditLogData): Promise<void> {
  try {
    await dbRun(
      db,
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.action,
        data.entity_type,
        data.entity_id ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ],
    );
  } catch (err) {
    // Audit log failure should NOT break the main flow
    console.error('[AUDIT] Failed to create audit log:', err);
  }
}
