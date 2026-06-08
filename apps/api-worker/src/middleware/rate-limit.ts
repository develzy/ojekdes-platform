import { createMiddleware } from 'hono/factory';
import { errorResponse } from '../lib/response';
import { getClientIP } from '../utils/index';
import type { Env } from '../types/bindings';
import type { Variables } from '../types/context';

export interface RateLimitOptions {
  /** Jumlah request maksimum per window */
  limit: number;
  /** Durasi window dalam detik */
  windowSeconds: number;
  /** Prefix key KV (default: 'rl') */
  keyPrefix?: string;
}

/**
 * Rate limiter middleware menggunakan Cloudflare KV sebagai store.
 *
 * Strategy: Sliding window counter per IP + endpoint.
 * Jika KV tidak tersedia (binding tidak dikonfigurasi), middleware ini dilangkahi.
 *
 * @example
 * // Limit 5 register request per 5 menit per IP
 * router.post('/register',
 *   rateLimit({ limit: 5, windowSeconds: 300, keyPrefix: 'register' }),
 *   handler,
 * );
 */
export function rateLimit(options: RateLimitOptions) {
  const { limit, windowSeconds, keyPrefix = 'rl' } = options;

  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const kv = c.env.RATE_LIMIT_KV;

    // Jika KV tidak di-bind (e.g., di test env), langkahi rate limiting
    if (!kv) {
      await next();
      return;
    }

    const ip = getClientIP(c.req.raw.headers);
    const key = `${keyPrefix}:${ip}:${c.req.path}`;

    // Baca counter saat ini
    const currentRaw = await kv.get(key);
    const current = currentRaw ? parseInt(currentRaw, 10) : 0;

    // Set response headers (selalu, bahkan saat ditolak)
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(Math.max(0, limit - current - 1)));
    c.header('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + windowSeconds));

    if (current >= limit) {
      c.header('Retry-After', String(windowSeconds));
      return errorResponse(
        c,
        'Terlalu banyak permintaan. Silakan coba lagi nanti.',
        [],
        429,
      );
    }

    // Increment counter dengan TTL
    // Jika key baru, TTL dimulai dari sekarang (sliding window)
    await kv.put(key, String(current + 1), { expirationTtl: windowSeconds });

    await next();
  });
}
