import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { MerchantProductService } from '../../services/merchant-product.service';
import { MerchantService } from '../../services/merchant.service';
import {
  CreateProductSchema,
  UpdateProductSchema,
  ProductQuerySchema,
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

const merchantProductsApp = new Hono<{ Bindings: Env; Variables: Variables }>();
const productService  = new MerchantProductService();
const merchantService = new MerchantService();

// ─── POST /api/merchant-products — Buat produk (merchant owner) ───────────────
merchantProductsApp.post(
  '/',
  authenticate,
  zValidator('json', CreateProductSchema),
  async (c) => {
    const data  = c.req.valid('json');
    const actor = c.get('user');
    try {
      // Ambil merchant_id dari merchant milik actor
      const myMerchant = await merchantService.getMyMerchant(actor.id, c.env.DB);
      const result = await productService.createProduct(data, myMerchant.id, actor.id, c.env.DB);
      return successResponse(c, result, 'Produk berhasil dibuat', 201);
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal membuat produk', [], 400);
    }
  },
);

// ─── GET /api/merchant-products — List produk (public) ────────────────────────
merchantProductsApp.get('/', zValidator('query', ProductQuerySchema), async (c) => {
  const query = c.req.valid('query');
  try {
    const { products, total } = await productService.listProducts(query, c.env.DB);
    return paginatedResponse(c, products, total, query.page, query.limit, 'Daftar produk berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil daftar produk', [], 500);
  }
});

// ─── GET /api/merchant-products/:id — Detail produk (public) ──────────────────
merchantProductsApp.get('/:id', zValidator('param', IdParamsSchema), async (c) => {
  const { id } = c.req.valid('param');
  try {
    const product = await productService.getProductById(id, c.env.DB);
    return successResponse(c, product, 'Produk berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Produk tidak ditemukan', [], 404);
  }
});

// ─── PUT /api/merchant-products/:id — Update produk ──────────────────────────
merchantProductsApp.put(
  '/:id',
  authenticate,
  zValidator('param', IdParamsSchema),
  zValidator('json', UpdateProductSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data   = c.req.valid('json');
    const actor  = c.get('user');
    try {
      // Cek ownership jika bukan staff
      if (!isStaff(actor.role)) {
        const product    = await productService.getProductById(id, c.env.DB);
        const myMerchant = await merchantService.getMyMerchant(actor.id, c.env.DB);
        if (product.merchant_id !== myMerchant.id) {
          return errorResponse(c, 'Anda tidak berhak mengubah produk ini', [], 403);
        }
      }
      await productService.updateProduct(id, data, actor.id, c.env.DB);
      return successResponse(c, null, 'Produk berhasil diperbarui');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal memperbarui produk', [], 400);
    }
  },
);

// ─── DELETE /api/merchant-products/:id — Soft delete produk ──────────────────
merchantProductsApp.delete(
  '/:id',
  authenticate,
  zValidator('param', IdParamsSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const actor  = c.get('user');
    try {
      if (!isStaff(actor.role)) {
        const product    = await productService.getProductById(id, c.env.DB);
        const myMerchant = await merchantService.getMyMerchant(actor.id, c.env.DB);
        if (product.merchant_id !== myMerchant.id) {
          return errorResponse(c, 'Anda tidak berhak menghapus produk ini', [], 403);
        }
      }
      await productService.deleteProduct(id, actor.id, c.env.DB);
      return successResponse(c, null, 'Produk berhasil dihapus');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal menghapus produk', [], 400);
    }
  },
);

export default merchantProductsApp;
