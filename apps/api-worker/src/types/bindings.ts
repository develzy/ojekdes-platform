/**
 * Cloudflare Worker Bindings — semua resource yang di-bind ke Worker ini.
 * Digunakan sebagai generic parameter di Hono: `new Hono<{ Bindings: Env }>()`.
 */
export interface Env {
  /** Cloudflare D1 database binding */
  DB: D1Database;

  /** Cloudflare KV namespace untuk rate limiting */
  RATE_LIMIT_KV: KVNamespace;

  /** Secret untuk signing JWT Access Token (set via: wrangler secret put JWT_ACCESS_SECRET) */
  JWT_ACCESS_SECRET: string;

  /** Secret untuk signing JWT Refresh Token (set via: wrangler secret put JWT_REFRESH_SECRET) */
  JWT_REFRESH_SECRET: string;

  /** Allowed CORS origin (e.g. 'https://admin.ojekdes.app') */
  CORS_ORIGIN: string;

  /** Runtime environment identifier */
  NODE_ENV?: string;
}
