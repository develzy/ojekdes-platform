import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AuthService } from '../../services/auth.service';
import { RegisterSchema, LoginSchema, RefreshTokenRequestSchema } from '../../validators/auth';
import { authenticate } from '../../middleware/auth';
import { successResponse, errorResponse } from '../../lib/response';
import type { Env } from '../../types/bindings';
import type { Variables } from '../../types/context';

const authApp = new Hono<{ Bindings: Env; Variables: Variables }>();
const authService = new AuthService();

authApp.post('/register', zValidator('json', RegisterSchema), async (c) => {
  const data = c.req.valid('json');
  try {
    const response = await authService.register(
      {
        phone: data.phone,
        email: data.email,
        password: data.password,
        role: data.role,
        fullName: data.full_name,
        licenseNumber: data.license_number ?? undefined,
      },
      c.env.DB,
      c.env,
    );
    return successResponse(c, response, 'Registrasi berhasil', 201);
  } catch (err: any) {
    return errorResponse(c, err.message || 'Registrasi gagal', [], 400);
  }
});

authApp.post('/login', zValidator('json', LoginSchema), async (c) => {
  const data = c.req.valid('json');
  try {
    const response = await authService.login(data, c.env.DB, c.env);
    return successResponse(c, response, 'Login berhasil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Login gagal', [], 400);
  }
});

authApp.post('/refresh', zValidator('json', RefreshTokenRequestSchema), async (c) => {
  const data = c.req.valid('json');
  try {
    const response = await authService.refresh(data.refreshToken, c.env.DB, c.env);
    return successResponse(c, response, 'Token berhasil diperbarui');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Refresh token gagal', [], 401);
  }
});

authApp.post('/logout', authenticate, async (c) => {
  const user = c.get('user');
  try {
    await authService.logout(user.id, c.env.DB);
    return successResponse(c, null, 'Logout berhasil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Logout gagal', [], 400);
  }
});

authApp.get('/me', authenticate, async (c) => {
  const user = c.get('user');
  try {
    const profile = await authService.getMe(user.id, c.env.DB);
    return successResponse(c, profile, 'Profile berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil profile', [], 400);
  }
});

export default authApp;
