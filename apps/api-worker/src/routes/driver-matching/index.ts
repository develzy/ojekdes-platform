import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { DriverMatchingService } from '../../services/driver-matching.service';
import {
  UpdateDriverLocationSchema,
  BroadcastOrderSchema,
  NearbyDriverQuerySchema,
} from '../../validators/matching';
import { IdParamsSchema } from '../../validators/common';
import { authenticate } from '../../middleware/auth';
import { requireStaff, requireRole } from '../../middleware/permissions';
import { successResponse, errorResponse } from '../../lib/response';
import type { Env } from '../../types/bindings';
import type { Variables } from '../../types/context';
import { z } from 'zod';

const driverMatchingApp = new Hono<{ Bindings: Env; Variables: Variables }>();
const matchingService = new DriverMatchingService();

const QueueQuerySchema = z.object({
  order_id: z.coerce.number().int().positive('order_id harus berupa angka positif'),
});

// ─── POST /api/drivers/online — Aktifkan status online driver ──────────────────
driverMatchingApp.post(
  '/drivers/online',
  authenticate,
  requireRole('driver'),
  async (c) => {
    const actor = c.get('user');
    try {
      await matchingService.setDriverOnline(actor.id, c.env.DB);
      return successResponse(c, null, 'Driver sekarang online');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mengaktifkan status online driver', [], 400);
    }
  }
);

// ─── POST /api/drivers/offline — Matikan status online driver ─────────────────
driverMatchingApp.post(
  '/drivers/offline',
  authenticate,
  requireRole('driver'),
  async (c) => {
    const actor = c.get('user');
    try {
      await matchingService.setDriverOffline(actor.id, c.env.DB);
      return successResponse(c, null, 'Driver sekarang offline');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal menonaktifkan status online driver', [], 400);
    }
  }
);

// ─── POST /api/drivers/location — Update lokasi terbaru driver ────────────────
driverMatchingApp.post(
  '/drivers/location',
  authenticate,
  requireRole('driver'),
  zValidator('json', UpdateDriverLocationSchema),
  async (c) => {
    const data = c.req.valid('json');
    const actor = c.get('user');
    try {
      await matchingService.updateDriverLocation(actor.id, data, c.env.DB);
      return successResponse(c, null, 'Lokasi driver berhasil diperbarui');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal memperbarui lokasi driver', [], 400);
    }
  }
);

// ─── GET /api/drivers/nearby — Cari driver online terdekat (Staff/Admin) ────────
driverMatchingApp.get(
  '/drivers/nearby',
  authenticate,
  requireStaff,
  zValidator('query', NearbyDriverQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    try {
      const drivers = await matchingService.findNearbyDrivers(
        query.latitude,
        query.longitude,
        query.max_radius_km,
        c.env.DB
      );
      return successResponse(c, drivers, 'Daftar driver terdekat berhasil diambil');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mengambil daftar driver terdekat', [], 500);
    }
  }
);

// ─── GET /api/drivers/queue — Lihat matching queue order (Staff/Admin) ─────────
driverMatchingApp.get(
  '/drivers/queue',
  authenticate,
  requireStaff,
  zValidator('query', QueueQuerySchema),
  async (c) => {
    const { order_id } = c.req.valid('query');
    try {
      const queue = await matchingService.getDriverQueue(order_id, c.env.DB);
      return successResponse(c, queue, 'Matching queue berhasil diambil');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mengambil matching queue', [], 500);
    }
  }
);

// ─── POST /api/orders/:id/broadcast — Trigger manual broadcast order ──────────
driverMatchingApp.post(
  '/orders/:id/broadcast',
  authenticate,
  requireStaff,
  zValidator('param', IdParamsSchema),
  zValidator('json', BroadcastOrderSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { max_radius_km } = c.req.valid('json');
    try {
      await matchingService.broadcastOrder(id, max_radius_km, c.env.DB);
      return successResponse(c, null, 'Broadcast order berhasil dimulai');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal memulai broadcast order', [], 400);
    }
  }
);

// ─── POST /api/orders/:id/accept — Driver menerima penugasan broadcast ────────
driverMatchingApp.post(
  '/orders/:id/accept',
  authenticate,
  requireRole('driver'),
  zValidator('param', IdParamsSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const actor = c.get('user');
    try {
      await matchingService.acceptOrder(id, actor.id, c.env.DB);
      return successResponse(c, null, 'Order berhasil diterima');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal menerima order', [], 400);
    }
  }
);

// ─── POST /api/orders/:id/reject — Driver menolak penugasan broadcast ─────────
driverMatchingApp.post(
  '/orders/:id/reject',
  authenticate,
  requireRole('driver'),
  zValidator('param', IdParamsSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const actor = c.get('user');
    try {
      await matchingService.rejectOrder(id, actor.id, c.env.DB);
      return successResponse(c, null, 'Order ditolak');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal menolak order', [], 400);
    }
  }
);

export default driverMatchingApp;
