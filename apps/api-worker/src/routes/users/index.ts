import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { UserService } from '../../services/user.service';
import { ListUsersQuerySchema, UpdateUserSchema } from '../../validators/user';
import { IdParamsSchema } from '../../validators/common';
import { authenticate } from '../../middleware/auth';
import { requireStaff, requireAnyRole, requireRole } from '../../middleware/permissions';
import { successResponse, errorResponse, paginatedResponse } from '../../lib/response';
import type { Env } from '../../types/bindings';
import type { Variables } from '../../types/context';

const usersApp = new Hono<{ Bindings: Env; Variables: Variables }>();
const userService = new UserService();

// List users (Staff only)
usersApp.get('/', authenticate, requireStaff, zValidator('query', ListUsersQuerySchema), async (c) => {
  const { page, limit, role } = c.req.valid('query');
  try {
    const { users, total } = await userService.list(page, limit, role, c.env.DB);
    return paginatedResponse(c, users, total, page, limit, 'Daftar user berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil daftar user', [], 400);
  }
});

// Get user by ID (Staff only)
usersApp.get('/:id', authenticate, requireStaff, zValidator('param', IdParamsSchema), async (c) => {
  const { id } = c.req.valid('param');
  try {
    const user = await userService.getById(id, c.env.DB);
    return successResponse(c, user, 'User berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil detail user', [], 400);
  }
});

// Update user (Admin/Super Admin only)
usersApp.patch(
  '/:id',
  authenticate,
  requireAnyRole(['admin', 'super_admin']),
  zValidator('param', IdParamsSchema),
  zValidator('json', UpdateUserSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const actor = c.get('user');
    try {
      const user = await userService.update(id, data, c.env.DB, actor.id);
      return successResponse(c, user, 'User berhasil diperbarui');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal memperbarui user', [], 400);
    }
  },
);

// Deactivate/Soft Delete user (Super Admin only)
usersApp.delete(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  zValidator('param', IdParamsSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const actor = c.get('user');
    try {
      await userService.deactivate(id, c.env.DB, actor.id);
      return successResponse(c, null, 'User berhasil dinonaktifkan');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal menonaktifkan user', [], 400);
    }
  },
);

export default usersApp;
