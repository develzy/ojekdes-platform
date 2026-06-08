import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { DriverService } from '../../services/driver.service';
import { ListDriversQuerySchema, UpdateDriverStatusSchema } from '../../validators/driver';
import { IdParamsSchema } from '../../validators/common';
import { authenticate } from '../../middleware/auth';
import { requireStaff } from '../../middleware/permissions';
import { successResponse, errorResponse, paginatedResponse } from '../../lib/response';
import type { Env } from '../../types/bindings';
import type { Variables } from '../../types/context';

const driversApp = new Hono<{ Bindings: Env; Variables: Variables }>();
const driverService = new DriverService();

// List drivers (Staff only)
driversApp.get('/', authenticate, requireStaff, zValidator('query', ListDriversQuerySchema), async (c) => {
  const { page, limit, status } = c.req.valid('query');
  try {
    const { drivers, total } = await driverService.list(page, limit, status, c.env.DB);
    return paginatedResponse(c, drivers, total, page, limit, 'Daftar driver berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil daftar driver', [], 400);
  }
});

// Get driver by ID (Staff only)
driversApp.get('/:id', authenticate, requireStaff, zValidator('param', IdParamsSchema), async (c) => {
  const { id } = c.req.valid('param');
  try {
    const driver = await driverService.getById(id, c.env.DB);
    return successResponse(c, driver, 'Driver berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil detail driver', [], 400);
  }
});

// Update driver status (Staff only)
driversApp.patch(
  '/:id/status',
  authenticate,
  requireStaff,
  zValidator('param', IdParamsSchema),
  zValidator('json', UpdateDriverStatusSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { status } = c.req.valid('json');
    const actor = c.get('user');
    try {
      const driver = await driverService.updateStatus(id, status, c.env.DB, actor.id);
      return successResponse(c, driver, 'Status driver berhasil diperbarui');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal memperbarui status driver', [], 400);
    }
  },
);

export default driversApp;
