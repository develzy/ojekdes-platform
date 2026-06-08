import { createMiddleware } from 'hono/factory';
import { verifyAccessToken } from '@ojekdes/shared-auth';
import { errorResponse } from '../lib/response';
import type { Env } from '../types/bindings';
import type { Variables } from '../types/context';

/**
 * Middleware autentikasi JWT.
 *
 * Mengekstrak Bearer token dari Authorization header, memverifikasi
 * dengan `verifyAccessToken`, lalu meng-inject user payload ke context.
 *
 * Jika token tidak valid, mengembalikan 401.
 *
 * @example
 * // Di route file:
 * router.get('/me', authenticate, async (c) => {
 *   const user = c.get('user'); // { id, role, sessionId, sub }
 *   ...
 * });
 */
export const authenticate = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(c, 'Token autentikasi diperlukan', [], 401);
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return errorResponse(c, 'Token autentikasi tidak boleh kosong', [], 401);
  }

  const payload = await verifyAccessToken(token, c.env.JWT_ACCESS_SECRET);

  if (!payload) {
    return errorResponse(c, 'Token tidak valid atau sudah kadaluarsa', [], 401);
  }

  // Inject user ke context untuk dipakai di handler berikutnya
  c.set('user', {
    id: Number(payload.sub),
    role: payload.role,
    sessionId: payload.sessionId,
    sub: payload.sub,
  });

  await next();
});
