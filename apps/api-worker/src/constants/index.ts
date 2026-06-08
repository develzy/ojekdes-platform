/**
 * Konstanta global untuk api-worker.
 */

// ─── API ──────────────────────────────────────────────────────────────────────
export const API_VERSION = 'v1';
export const SERVICE_NAME = 'ojekdes-api';
export const SERVICE_VERSION = '1.0.0';

// ─── Pagination ───────────────────────────────────────────────────────────────
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// ─── Rate Limiting ────────────────────────────────────────────────────────────
export const RATE_LIMIT = {
  AUTH_ENDPOINTS: { limit: 10, windowSeconds: 60 },
  API_ENDPOINTS: { limit: 60, windowSeconds: 60 },
  REGISTER: { limit: 5, windowSeconds: 300 }, // 5 req per 5 menit
} as const;

// ─── Audit Actions ────────────────────────────────────────────────────────────
export const AUDIT_ACTION = {
  // Auth
  REGISTER: 'register',
  LOGIN: 'login',
  LOGOUT: 'logout',
  REFRESH_TOKEN: 'refresh_token',
  // CRUD
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  DEACTIVATE: 'deactivate',
  ACTIVATE: 'activate',
  // Specific
  UPDATE_STATUS: 'update_status',
  VERIFY_DOCUMENT: 'verify_document',
} as const;

// ─── Entity Types (untuk audit_logs) ─────────────────────────────────────────
export const ENTITY_TYPE = {
  USER: 'user',
  SESSION: 'session',
  DRIVER: 'driver',
  CUSTOMER: 'customer',
  ORDER: 'order',
  PAYMENT: 'payment',
  WALLET: 'wallet',
} as const;
