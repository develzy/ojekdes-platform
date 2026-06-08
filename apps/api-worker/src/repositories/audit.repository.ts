import { dbQuery, dbQueryFirst, dbRun } from '../lib/db';

// ─── DB Row Type ──────────────────────────────────────────────────────────────

export interface DbAuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  metadata: string | null; // JSON string
  created_at: string;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class AuditRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Buat audit log entry baru.
   */
  async create(data: {
    user_id: number | null;
    action: string;
    entity_type: string;
    entity_id?: number | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await dbRun(
      this.db,
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
  }

  /**
   * Ambil audit log dengan pagination.
   */
  async list(
    page: number,
    limit: number,
    userId?: number,
    entityType?: string,
  ): Promise<{ logs: DbAuditLog[]; total: number }> {
    const offset = (page - 1) * limit;
    const filters: string[] = [];
    const params: (string | number)[] = [];

    if (userId !== undefined) {
      filters.push('user_id = ?');
      params.push(userId);
    }
    if (entityType !== undefined) {
      filters.push('entity_type = ?');
      params.push(entityType);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const [logs, countResult] = await Promise.all([
      dbQuery<DbAuditLog>(
        this.db,
        `SELECT * FROM audit_logs ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
      dbQueryFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
        params,
      ),
    ]);

    return { logs, total: countResult?.count ?? 0 };
  }
}
