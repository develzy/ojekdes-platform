import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { LocationService } from '../../services/location.service';
import { IdParamsSchema } from '../../validators/common';
import { successResponse, errorResponse } from '../../lib/response';
import type { Env } from '../../types/bindings';

const locationsApp = new Hono<{ Bindings: Env }>();
const locationService = new LocationService();

const ListVillagesQuerySchema = z.object({
  active_only: z.preprocess((val) => val === 'true' || val === '1', z.boolean()).optional(),
});

// List villages
locationsApp.get('/villages', zValidator('query', ListVillagesQuerySchema), async (c) => {
  const { active_only } = c.req.valid('query');
  try {
    const villages = await locationService.getVillages(active_only, c.env.DB);
    return successResponse(c, villages, 'Daftar desa berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil daftar desa', [], 400);
  }
});

// Get village by ID
locationsApp.get('/villages/:id', zValidator('param', IdParamsSchema), async (c) => {
  const { id } = c.req.valid('param');
  try {
    const village = await locationService.getVillageById(id, c.env.DB);
    return successResponse(c, village, 'Desa berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil detail desa', [], 400);
  }
});

// Get hamlets in a village
locationsApp.get('/villages/:id/hamlets', zValidator('param', IdParamsSchema), async (c) => {
  const { id } = c.req.valid('param');
  try {
    const hamlets = await locationService.getHamletsByVillageId(id, c.env.DB);
    return successResponse(c, hamlets, 'Daftar dusun berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil daftar dusun', [], 400);
  }
});

// Get active service areas
locationsApp.get('/service-areas', async (c) => {
  try {
    const serviceAreas = await locationService.getServiceAreas(c.env.DB);
    return successResponse(c, serviceAreas, 'Daftar area layanan berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil area layanan', [], 400);
  }
});

export default locationsApp;
