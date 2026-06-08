/**
 * D1 Database query helpers.
 * Semua query D1 harus melalui helper ini untuk konsistensi dan error handling.
 */

/**
 * Eksekusi SELECT query yang mengembalikan banyak baris.
 *
 * @example
 * const users = await dbQuery<DbUser>(db, 'SELECT * FROM users WHERE role = ?', ['admin']);
 */
export async function dbQuery<T>(
  db: D1Database,
  sql: string,
  params: (string | number | boolean | null)[] = [],
): Promise<T[]> {
  const result = await db.prepare(sql).bind(...params).all<T>();
  return result.results ?? [];
}

/**
 * Eksekusi SELECT query yang mengembalikan satu baris atau null.
 *
 * @example
 * const user = await dbQueryFirst<DbUser>(db, 'SELECT * FROM users WHERE id = ?', [1]);
 */
export async function dbQueryFirst<T>(
  db: D1Database,
  sql: string,
  params: (string | number | boolean | null)[] = [],
): Promise<T | null> {
  const result = await db.prepare(sql).bind(...params).first<T>();
  return result ?? null;
}

/**
 * Eksekusi INSERT / UPDATE / DELETE statement.
 * Returns D1Result yang berisi `meta.last_row_id` dan `meta.changes`.
 *
 * @example
 * const result = await dbRun(db, 'INSERT INTO users (...) VALUES (...)', [...]);
 * const newId = result.meta.last_row_id;
 */
export async function dbRun(
  db: D1Database,
  sql: string,
  params: (string | number | boolean | null)[] = [],
): Promise<D1Result> {
  return db.prepare(sql).bind(...params).run();
}

/**
 * Eksekusi beberapa statement dalam satu batch D1 (atomic).
 * Lebih efisien daripada banyak dbRun() terpisah untuk operasi multi-step.
 *
 * @example
 * await dbBatch(db, [
 *   { sql: 'INSERT INTO users ...', params: [...] },
 *   { sql: 'INSERT INTO user_profiles ...', params: [...] },
 * ]);
 */
export async function dbBatch(
  db: D1Database,
  statements: { sql: string; params?: (string | number | boolean | null)[] }[],
): Promise<D1Result[]> {
  const stmts = statements.map(({ sql, params = [] }) =>
    db.prepare(sql).bind(...params),
  );
  return db.batch(stmts);
}
