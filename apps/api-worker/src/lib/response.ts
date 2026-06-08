import type { Context } from 'hono';

// ─── Response Shapes ──────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors: unknown[];
}

export interface ApiPaginatedResponse<T = unknown> {
  success: true;
  message: string;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Response Helpers ─────────────────────────────────────────────────────────

/**
 * Response sukses standar.
 * @example
 * return successResponse(c, { id: 1 }, 'User ditemukan');
 */
export function successResponse<T>(
  c: Context,
  data: T,
  message = 'Berhasil',
  status = 200,
) {
  return c.json<ApiSuccessResponse<T>>({ success: true, message, data }, status as 200 | 201);
}

/**
 * Response error standar dengan array of errors.
 * @example
 * return errorResponse(c, 'Validasi gagal', errors, 422);
 */
export function errorResponse(
  c: Context,
  message: string,
  errors: unknown[] = [],
  status = 400,
) {
  return c.json<ApiErrorResponse>(
    { success: false, message, errors },
    status as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
  );
}

/**
 * Response list dengan pagination metadata.
 */
export function paginatedResponse<T>(
  c: Context,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Berhasil',
) {
  return c.json<ApiPaginatedResponse<T>>({
    success: true,
    message,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * Response 404 Not Found standar.
 */
export function notFoundResponse(c: Context, resource = 'Resource') {
  return errorResponse(c, `${resource} tidak ditemukan`, [], 404);
}

/**
 * Response 409 Conflict standar.
 */
export function conflictResponse(c: Context, message: string) {
  return errorResponse(c, message, [], 409);
}
