import { createMiddleware } from 'hono/factory';
import type { Env } from '../types/bindings';
import type { Variables } from '../types/context';

/**
 * Request logger middleware.
 * Logs: [METHOD] [PATH] → [STATUS] [DURATION]ms
 *
 * Contoh output:
 *   [2026-06-08T02:10:00Z] POST /api/auth/login → 200 (45ms)
 */
export const loggerMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;
  const env = c.env.NODE_ENV ?? 'development';

  // Warna status untuk readability di Cloudflare Workers log
  const statusLabel =
    status >= 500 ? `❌ ${status}` :
    status >= 400 ? `⚠️  ${status}` :
    status >= 300 ? `↪  ${status}` :
    `✅ ${status}`;

  console.log(
    `[${new Date().toISOString()}] [${env}] ${method} ${path} → ${statusLabel} (${duration}ms)`,
  );
});
