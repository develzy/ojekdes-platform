import { secureHeaders } from 'hono/secure-headers';

/**
 * Security headers middleware.
 * Menambahkan HTTP security headers ke setiap response:
 *
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - X-XSS-Protection: 1; mode=block
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Permissions-Policy: camera=(), microphone=(), geolocation=()
 * - Strict-Transport-Security (HSTS)
 *
 * Tidak di-include Content-Security-Policy karena ini adalah REST API,
 * bukan HTML yang disajikan ke browser secara langsung.
 */
export const securityMiddleware = secureHeaders({
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
  },
});
