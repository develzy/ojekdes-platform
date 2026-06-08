import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { OrderService } from '../../services/order.service';
import {
  CreateRideOrderSchema,
  CreateCourierOrderSchema,
  AssignDriverSchema,
  RejectAssignmentSchema,
  UpdateOrderStatusSchema,
  OrderTrackingSchema,
  CancelOrderSchema,
  CreateRatingSchema,
  UploadProofSchema,
  OrderQuerySchema,
} from '../../validators/order';
import { IdParamsSchema } from '../../validators/common';
import { authenticate } from '../../middleware/auth';
import { requireStaff, requireRole } from '../../middleware/permissions';
import { isStaff } from '@ojekdes/shared-auth';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from '../../lib/response';
import type { Env } from '../../types/bindings';
import type { Variables } from '../../types/context';

const ordersApp = new Hono<{ Bindings: Env; Variables: Variables }>();
const orderService = new OrderService();

// ─── POST /api/orders/ride — Customer buat order RIDE ─────────────────────────
ordersApp.post(
  '/ride',
  authenticate,
  zValidator('json', CreateRideOrderSchema),
  async (c) => {
    const data = c.req.valid('json');
    const actor = c.get('user');
    try {
      const result = await orderService.createRideOrder(data, actor.id, c.env.DB);
      return successResponse(c, result, 'Order RIDE berhasil dibuat', 201);
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal membuat order RIDE', [], 400);
    }
  }
);

// ─── POST /api/orders/courier — Customer buat order COURIER ───────────────────
ordersApp.post(
  '/courier',
  authenticate,
  zValidator('json', CreateCourierOrderSchema),
  async (c) => {
    const data = c.req.valid('json');
    const actor = c.get('user');
    try {
      const result = await orderService.createCourierOrder(data, actor.id, c.env.DB);
      return successResponse(c, result, 'Order COURIER berhasil dibuat', 201);
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal membuat order COURIER', [], 400);
    }
  }
);

// ─── GET /api/orders — List order (role-aware) ────────────────────────────────
ordersApp.get(
  '/',
  authenticate,
  zValidator('query', OrderQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const actor = c.get('user');
    try {
      const { orders, total } = await orderService.listOrders(
        query,
        actor.id,
        actor.role,
        c.env.DB
      );
      return paginatedResponse(c, orders, total, query.page, query.limit, 'Daftar order berhasil diambil');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mengambil daftar order', [], 500);
    }
  }
);

// ─── GET /api/orders/:id — Detail order ───────────────────────────────────────
ordersApp.get(
  '/:id',
  authenticate,
  zValidator('param', IdParamsSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const actor = c.get('user');
    try {
      const order = await orderService.getOrderDetail(id, c.env.DB);
      // Access check: Staff can view all orders. Customer & Driver can only view their own orders.
      if (!isStaff(actor.role) && order.customer_id !== actor.id && order.driver_id !== actor.id) {
        return errorResponse(c, 'Order tidak ditemukan', [], 404);
      }
      return successResponse(c, order, 'Order berhasil diambil');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Order tidak ditemukan', [], 404);
    }
  }
);

// ─── PATCH /api/orders/:id/assign — Assign driver (Admin/Staff only) ───────────
ordersApp.patch(
  '/:id/assign',
  authenticate,
  requireStaff,
  zValidator('param', IdParamsSchema),
  zValidator('json', AssignDriverSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const actor = c.get('user');
    try {
      const result = await orderService.assignDriver(id, data, actor.id, c.env.DB);
      return successResponse(c, result, 'Driver berhasil ditugaskan');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal menugaskan driver', [], 400);
    }
  }
);

// ─── PATCH /api/orders/:id/accept — Driver accept assignment (Driver only) ─────
ordersApp.patch(
  '/:id/accept',
  authenticate,
  requireRole('driver'),
  zValidator('param', IdParamsSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const actor = c.get('user');
    try {
      const result = await orderService.acceptAssignment(id, actor.id, c.env.DB);
      return successResponse(c, result, 'Penugasan diterima');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal menerima penugasan', [], 400);
    }
  }
);

// ─── PATCH /api/orders/:id/reject — Driver reject assignment (Driver only) ─────
ordersApp.patch(
  '/:id/reject',
  authenticate,
  requireRole('driver'),
  zValidator('param', IdParamsSchema),
  zValidator('json', RejectAssignmentSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const actor = c.get('user');
    try {
      const result = await orderService.rejectAssignment(id, actor.id, data, c.env.DB);
      return successResponse(c, result, 'Penugasan ditolak');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal menolak penugasan', [], 400);
    }
  }
);

// ─── PATCH /api/orders/:id/status — Update order status ────────────────────────
ordersApp.patch(
  '/:id/status',
  authenticate,
  zValidator('param', IdParamsSchema),
  zValidator('json', UpdateOrderStatusSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const actor = c.get('user');
    try {
      const result = await orderService.updateStatus(id, data, actor.id, actor.role, c.env.DB);
      return successResponse(c, result, `Status order berhasil diubah menjadi ${data.status}`);
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mengubah status order', [], 400);
    }
  }
);

// ─── PATCH /api/orders/:id/cancel — Cancel order ──────────────────────────────
ordersApp.patch(
  '/:id/cancel',
  authenticate,
  zValidator('param', IdParamsSchema),
  zValidator('json', CancelOrderSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const actor = c.get('user');
    try {
      await orderService.cancelOrder(id, data, actor.id, actor.role, c.env.DB);
      return successResponse(c, null, 'Order berhasil dibatalkan');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal membatalkan order', [], 400);
    }
  }
);

// ─── POST /api/orders/:id/tracking — Record driver tracking (Driver only) ──────
ordersApp.post(
  '/:id/tracking',
  authenticate,
  requireRole('driver'),
  zValidator('param', IdParamsSchema),
  zValidator('json', OrderTrackingSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const actor = c.get('user');
    try {
      await orderService.recordTracking(id, data, actor.id, c.env.DB);
      return successResponse(c, null, 'Lokasi driver berhasil diperbarui');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal memperbarui lokasi driver', [], 400);
    }
  }
);

// ─── POST /api/orders/:id/proof — Upload proof (Pickup/Delivery) ───────────────
ordersApp.post(
  '/:id/proof',
  authenticate,
  zValidator('param', IdParamsSchema),
  zValidator('json', UploadProofSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const actor = c.get('user');
    try {
      await orderService.uploadProof(id, data, actor.id, c.env.DB);
      return successResponse(c, null, 'Bukti berhasil diunggah');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mengunggah bukti', [], 400);
    }
  }
);

// ─── POST /api/orders/:id/rating — Customer rate driver (Customer only) ────────
ordersApp.post(
  '/:id/rating',
  authenticate,
  requireRole('customer'),
  zValidator('param', IdParamsSchema),
  zValidator('json', CreateRatingSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const actor = c.get('user');
    try {
      await orderService.createRating(id, data, actor.id, c.env.DB);
      return successResponse(c, null, 'Rating berhasil diberikan');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal memberikan rating', [], 400);
    }
  }
);

export default ordersApp;
