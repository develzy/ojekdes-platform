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
  UPDATE_STATUS:     'update_status',
  VERIFY_DOCUMENT:   'verify_document',
  // Merchant
  APPROVE_MERCHANT:  'approve_merchant',
  REJECT_MERCHANT:   'reject_merchant',
  SUSPEND_MERCHANT:  'suspend_merchant',
  // Order Engine
  CREATE_ORDER:        'create_order',
  ASSIGN_DRIVER:       'assign_driver',
  ACCEPT_ASSIGNMENT:   'accept_assignment',
  REJECT_ASSIGNMENT:   'reject_assignment',
  UPDATE_ORDER_STATUS: 'update_order_status',
  CANCEL_ORDER:        'cancel_order',
  UPLOAD_PROOF:        'upload_proof',
  CREATE_RATING:       'create_rating',
  TRACK_DRIVER:        'track_driver',
} as const;

// ─── Entity Types (untuk audit_logs) ─────────────────────────────────────────
export const ENTITY_TYPE = {
  USER:             'user',
  SESSION:          'session',
  DRIVER:           'driver',
  CUSTOMER:         'customer',
  ORDER:            'order',
  PAYMENT:          'payment',
  WALLET:           'wallet',
  // Merchant
  MERCHANT:          'merchant',
  MERCHANT_PRODUCT:  'merchant_product',
  MERCHANT_ORDER:    'merchant_order',
  MERCHANT_DOCUMENT: 'merchant_document',
  // Order Engine
  ORDER_TRACKING:    'order_tracking',
  DRIVER_ASSIGNMENT: 'driver_assignment',
} as const;
