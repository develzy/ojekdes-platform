import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { MerchantCategoryRepository, MerchantProductCategoryRepository } from '../../repositories/merchant-category.repository';
import { IdParamsSchema } from '../../validators/common';
import { successResponse, errorResponse } from '../../lib/response';
import type { Env } from '../../types/bindings';
import type { Variables } from '../../types/context';

const merchantCategoriesApp = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/merchant-categories — public
merchantCategoriesApp.get('/', async (c) => {
  try {
    const repo = new MerchantCategoryRepository(c.env.DB);
    const categories = await repo.findAll(true);
    return successResponse(c, categories, 'Kategori merchant berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil kategori merchant', [], 500);
  }
});

// GET /api/merchant-categories/:id — public
merchantCategoriesApp.get('/:id', zValidator('param', IdParamsSchema), async (c) => {
  const { id } = c.req.valid('param');
  try {
    const repo = new MerchantCategoryRepository(c.env.DB);
    const category = await repo.findById(id);
    if (!category) return errorResponse(c, 'Kategori tidak ditemukan', [], 404);
    return successResponse(c, category, 'Kategori berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil kategori', [], 500);
  }
});

// GET /api/merchant-categories/:id/product-categories — public
merchantCategoriesApp.get(
  '/:id/product-categories',
  zValidator('param', IdParamsSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    try {
      const repo = new MerchantProductCategoryRepository(c.env.DB);
      const categories = await repo.findByBusinessCategory(id);
      return successResponse(c, categories, 'Kategori produk berhasil diambil');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mengambil kategori produk', [], 500);
    }
  },
);

export default merchantCategoriesApp;
