import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { MerchantOrderService } from '../../services/merchant-order.service';
import { MerchantService } from '../../services/merchant.service';
import {
  CreateMerchantOrderSchema,
  UpdateMerchantOrderStatusSchema,
  MerchantOrderQuerySchema,
} from '../../validators/merchant';
import { IdParamsSchema } from '../../validators/common';
import { authenticate } from '../../middleware/auth';
import { isStaff } from '@ojekdes/shared-auth';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from '../../lib/response';
import type { Env } from '../../types/bindings';
import type { Variables } from '../../types/context';

const merchantOrdersApp = new Hono<{ Bindings: Env; Variables: Variables }>();
const orderService   = new MerchantOrderService();
const merchantService = new MerchantService();

// ─── POST /api/merchant-orders — Customer buat order ──────────────────────────
merchantOrdersApp.post(
  '/',
  authenticate,
  zValidator('json', CreateMerchantOrderSchema),
  async (c) => {
    const data  = c.req.valid('json');
    const actor = c.get('user');
    try {
      const result = await orderService.createOrder(data, actor.id, c.env.DB);
      return successResponse(c, result, 'Order berhasil dibuat', 201);
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal membuat order', [], 400);
    }
  },
);

// ─── GET /api/merchant-orders — List order (role-aware) ───────────────────────
merchantOrdersApp.get(
  '/',
  authenticate,
  zValidator('query', MerchantOrderQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const actor = c.get('user');
    try {
      // Cari merchant_id milik actor (jika merchant)
      let actorMerchantId: number | null = null;
      if (!isStaff(actor.role) && actor.role !== 'customer' && actor.role !== 'driver') {
        try {
          const myMerchant = await merchantService.getMyMerchant(actor.id, c.env.DB);
          actorMerchantId = myMerchant.id;
        } catch {
          // User belum punya merchant — tidak apa-apa
        }
      }

      const { orders, total } = await orderService.listOrders(
        query, actor.id, actor.role, actorMerchantId, c.env.DB,
      );
      return paginatedResponse(c, orders, total, query.page, query.limit, 'Daftar order berhasil diambil');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mengambil daftar order', [], 500);
    }
  },
);

// ─── GET /api/merchant-orders/:id — Detail order ─────────────────────────────
merchantOrdersApp.get('/:id', authenticate, zValidator('param', IdParamsSchema), async (c) => {
  const { id } = c.req.valid('param');
  const actor  = c.get('user');
  try {
    const order = await orderService.getOrderById(id, c.env.DB);

    // Role check: customer hanya bisa lihat order mereka sendiri
    if (actor.role === 'customer' && order.customer_id !== actor.id) {
      return errorResponse(c, 'Order tidak ditemukan', [], 404);
    }

    // Driver hanya bisa lihat order yang ditugaskan
    if (actor.role === 'driver' && order.driver_id !== actor.id) {
      return errorResponse(c, 'Order tidak ditemukan', [], 404);
    }

    return successResponse(c, order, 'Order berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Order tidak ditemukan', [], 404);
  }
});

// ─── PATCH /api/merchant-orders/:id/status — Update status ───────────────────
merchantOrdersApp.patch(
  '/:id/status',
  authenticate,
  zValidator('param', IdParamsSchema),
  zValidator('json', UpdateMerchantOrderStatusSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data   = c.req.valid('json');
    const actor  = c.get('user');
    try {
      await orderService.updateOrderStatus(id, data, actor.id, actor.role, c.env.DB);
      return successResponse(c, null, `Status order berhasil diubah menjadi ${data.status}`);
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mengubah status order', [], 400);
    }
  },
);

export default merchantOrdersApp;
