import type { UserRole } from '@ojekdes/shared-constants';

/**
 * Hono Context Variables — data yang diinject oleh middleware ke request context.
 * Digunakan sebagai generic parameter: `new Hono<{ Variables: Variables }>()`.
 */
export type Variables = {
  /**
   * Payload user yang sudah terautentikasi.
   * Di-set oleh `authenticate` middleware setelah verifikasi JWT berhasil.
   */
  user: {
    id: number;
    role: UserRole;
    sessionId: string;
    sub: string;
  };
};
