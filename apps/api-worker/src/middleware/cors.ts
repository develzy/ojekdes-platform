import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../types/bindings';
import type { Variables } from '../types/context';

/**
 * CORS middleware factory.
 * Membaca allowed origin dari environment variable `CORS_ORIGIN`.
 *
 * Di production, CORS_ORIGIN harus di-set ke domain spesifik.
 * Di development, bisa di-set ke '*' atau 'http://localhost:3000'.
 */
export const corsMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const origin = c.env.CORS_ORIGIN || '*';

  const corsHandler = cors({
    origin,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400, // 24 jam preflight cache
  });

  return corsHandler(c, next);
});
