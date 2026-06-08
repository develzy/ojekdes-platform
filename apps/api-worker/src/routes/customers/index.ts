import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { CustomerService } from '../../services/customer.service';
import { PaginationSchema, IdParamsSchema } from '../../validators/common';
import { authenticate } from '../../middleware/auth';
import { requireStaff } from '../../middleware/permissions';
import { successResponse, errorResponse, paginatedResponse } from '../../lib/response';
import type { Env } from '../../types/bindings';
import type { Variables } from '../../types/context';

const customersApp = new Hono<{ Bindings: Env; Variables: Variables }>();
const customerService = new CustomerService();

// List customers (Staff only)
customersApp.get('/', authenticate, requireStaff, zValidator('query', PaginationSchema), async (c) => {
  const { page, limit } = c.req.valid('query');
  try {
    const { customers, total } = await customerService.list(page, limit, c.env.DB);
    return paginatedResponse(c, customers, total, page, limit, 'Daftar customer berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil daftar customer', [], 400);
  }
});

// Get customer by ID (Staff only)
customersApp.get('/:id', authenticate, requireStaff, zValidator('param', IdParamsSchema), async (c) => {
  const { id } = c.req.valid('param');
  try {
    const customer = await customerService.getById(id, c.env.DB);
    return successResponse(c, customer, 'Customer berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil detail customer', [], 400);
  }
});

export default customersApp;
