import { createMiddleware } from 'hono/factory';
import { hasRole, hasAnyRole, isAdmin, isStaff } from '@ojekdes/shared-auth';
import type { UserRole } from '@ojekdes/shared-constants';
import { errorResponse } from '../lib/response';
import type { Env } from '../types/bindings';
import type { Variables } from '../types/context';

type AppMiddleware = ReturnType<typeof createMiddleware<{ Bindings: Env; Variables: Variables }>>;

/**
 * Middleware yang mensyaratkan user memiliki role TEPAT sesuai `requiredRole`.
 * Harus digunakan SETELAH `authenticate` middleware.
 *
 * @example
 * router.delete('/:id', authenticate, requireRole('super_admin'), handler);
 */
export function requireRole(requiredRole: UserRole): AppMiddleware {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return errorResponse(c, 'Autentikasi diperlukan', [], 401);
    }
    if (!hasRole(user.role, requiredRole)) {
      return errorResponse(c, 'Anda tidak memiliki akses ke resource ini', [], 403);
    }
    await next();
  });
}

/**
 * Middleware yang mensyaratkan user memiliki SALAH SATU dari `requiredRoles`.
 * Harus digunakan SETELAH `authenticate` middleware.
 *
 * @example
 * router.patch('/:id', authenticate, requireAnyRole(['admin', 'super_admin']), handler);
 */
export function requireAnyRole(requiredRoles: UserRole[]): AppMiddleware {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return errorResponse(c, 'Autentikasi diperlukan', [], 401);
    }
    if (!hasAnyRole(user.role, requiredRoles)) {
      return errorResponse(c, 'Anda tidak memiliki akses ke resource ini', [], 403);
    }
    await next();
  });
}

/**
 * Shortcut middleware untuk akses staff (super_admin, admin, operator).
 */
export const requireStaff = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return errorResponse(c, 'Autentikasi diperlukan', [], 401);
  }
  if (!isStaff(user.role)) {
    return errorResponse(c, 'Akses hanya untuk staf OjekDes', [], 403);
  }
  await next();
});

/**
 * Shortcut middleware untuk akses admin (super_admin, admin).
 */
export const requireAdmin = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return errorResponse(c, 'Autentikasi diperlukan', [], 401);
  }
  if (!isAdmin(user.role)) {
    return errorResponse(c, 'Akses hanya untuk admin OjekDes', [], 403);
  }
  await next();
});

/**
 * Middleware yang memastikan user hanya bisa mengakses resource milik mereka sendiri,
 * ATAU user adalah staff.
 * Mengecek `c.req.param('id')` vs `c.get('user').id`.
 *
 * @example
 * router.get('/customers/:id', authenticate, requireSelfOrStaff, handler);
 */
export const requireSelfOrStaff = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return errorResponse(c, 'Autentikasi diperlukan', [], 401);
  }
  const paramId = Number(c.req.param('id'));
  if (!isStaff(user.role) && user.id !== paramId) {
    return errorResponse(c, 'Anda hanya bisa mengakses data milik Anda sendiri', [], 403);
  }
  await next();
});
