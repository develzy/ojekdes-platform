import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { MerchantService } from '../../services/merchant.service';
import {
  CreateMerchantSchema,
  UpdateMerchantSchema,
  UpdateMerchantStatusSchema,
  MerchantQuerySchema,
  UploadDocumentSchema,
  CreateBankAccountSchema,
} from '../../validators/merchant';
import { IdParamsSchema } from '../../validators/common';
import { authenticate } from '../../middleware/auth';
import { requireStaff, requireAdmin } from '../../middleware/permissions';
import { isStaff } from '@ojekdes/shared-auth';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  notFoundResponse,
} from '../../lib/response';
import type { Env } from '../../types/bindings';
import type { Variables } from '../../types/context';

const merchantsApp = new Hono<{ Bindings: Env; Variables: Variables }>();
const merchantService = new MerchantService();

// ─── POST /api/merchants — Daftar merchant baru ────────────────────────────────
merchantsApp.post(
  '/',
  authenticate,
  zValidator('json', CreateMerchantSchema),
  async (c) => {
    const data  = c.req.valid('json');
    const actor = c.get('user');
    try {
      const result = await merchantService.createMerchant(data, actor.id, c.env.DB);
      return successResponse(c, result, 'Merchant berhasil didaftarkan', 201);
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mendaftarkan merchant', [], 400);
    }
  },
);

// ─── GET /api/merchants — List merchant (Staff only) ──────────────────────────
merchantsApp.get(
  '/',
  authenticate,
  requireStaff,
  zValidator('query', MerchantQuerySchema),
  async (c) => {
    const { page, limit, status, category_id, search } = c.req.valid('query');
    try {
      const { merchants, total } = await merchantService.listMerchants(
        page, limit, c.env.DB, status, category_id, search,
      );
      return paginatedResponse(c, merchants, total, page, limit, 'Daftar merchant berhasil diambil');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mengambil daftar merchant', [], 500);
    }
  },
);

// ─── GET /api/merchants/me — Merchant milik user sendiri ──────────────────────
merchantsApp.get('/me', authenticate, async (c) => {
  const actor = c.get('user');
  try {
    const merchant = await merchantService.getMyMerchant(actor.id, c.env.DB);
    return successResponse(c, merchant, 'Merchant berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil merchant', [], 404);
  }
});

// ─── GET /api/merchants/:id — Detail merchant ─────────────────────────────────
merchantsApp.get('/:id', authenticate, zValidator('param', IdParamsSchema), async (c) => {
  const { id } = c.req.valid('param');
  const actor  = c.get('user');
  try {
    const merchant = await merchantService.getMerchantById(id, c.env.DB);

    // Staff bisa lihat semua; non-staff hanya bisa lihat yang APPROVED atau milik mereka
    if (!isStaff(actor.role) && merchant.status !== 'APPROVED' && merchant.user_id !== actor.id) {
      return errorResponse(c, 'Merchant tidak ditemukan', [], 404);
    }

    return successResponse(c, merchant, 'Merchant berhasil diambil');
  } catch (err: any) {
    return notFoundResponse(c, 'Merchant');
  }
});

// ─── PUT /api/merchants/:id — Update merchant ─────────────────────────────────
merchantsApp.put(
  '/:id',
  authenticate,
  zValidator('param', IdParamsSchema),
  zValidator('json', UpdateMerchantSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data   = c.req.valid('json');
    const actor  = c.get('user');
    try {
      // Hanya owner atau admin yang bisa update
      if (!isStaff(actor.role)) {
        const merchant = await merchantService.getMerchantById(id, c.env.DB);
        if (merchant.user_id !== actor.id) {
          return errorResponse(c, 'Anda tidak berhak mengubah merchant ini', [], 403);
        }
      }
      await merchantService.updateMerchant(id, data, actor.id, c.env.DB);
      return successResponse(c, null, 'Merchant berhasil diperbarui');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal memperbarui merchant', [], 400);
    }
  },
);

// ─── PATCH /api/merchants/:id/status — Approve/Reject/Suspend (Admin) ─────────
merchantsApp.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  zValidator('param', IdParamsSchema),
  zValidator('json', UpdateMerchantStatusSchema),
  async (c) => {
    const { id }       = c.req.valid('param');
    const { status, reason } = c.req.valid('json');
    const actor        = c.get('user');
    try {
      if (status === 'APPROVED') {
        await merchantService.approveMerchant(id, actor.id, c.env.DB);
      } else if (status === 'REJECTED') {
        await merchantService.rejectMerchant(id, reason, actor.id, c.env.DB);
      } else if (status === 'SUSPENDED') {
        await merchantService.suspendMerchant(id, reason, actor.id, c.env.DB);
      }
      return successResponse(c, null, `Merchant berhasil diubah statusnya menjadi ${status}`);
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mengubah status merchant', [], 400);
    }
  },
);

// ─── DELETE /api/merchants/:id — Soft delete (Admin) ─────────────────────────
merchantsApp.delete(
  '/:id',
  authenticate,
  requireAdmin,
  zValidator('param', IdParamsSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const actor  = c.get('user');
    try {
      await merchantService.deleteMerchant(id, actor.id, c.env.DB);
      return successResponse(c, null, 'Merchant berhasil dihapus');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal menghapus merchant', [], 400);
    }
  },
);

// ─── POST /api/merchants/:id/documents ───────────────────────────────────────
merchantsApp.post(
  '/:id/documents',
  authenticate,
  zValidator('param', IdParamsSchema),
  zValidator('json', UploadDocumentSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data   = c.req.valid('json');
    const actor  = c.get('user');
    try {
      // Hanya owner atau admin
      if (!isStaff(actor.role)) {
        const merchant = await merchantService.getMerchantById(id, c.env.DB);
        if (merchant.user_id !== actor.id) {
          return errorResponse(c, 'Akses ditolak', [], 403);
        }
      }
      const result = await merchantService.uploadDocument(id, data, actor.id, c.env.DB);
      return successResponse(c, result, 'Dokumen berhasil diunggah', 201);
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mengunggah dokumen', [], 400);
    }
  },
);

// ─── GET /api/merchants/:id/documents ────────────────────────────────────────
merchantsApp.get(
  '/:id/documents',
  authenticate,
  zValidator('param', IdParamsSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const actor  = c.get('user');
    try {
      if (!isStaff(actor.role)) {
        const merchant = await merchantService.getMerchantById(id, c.env.DB);
        if (merchant.user_id !== actor.id) {
          return errorResponse(c, 'Akses ditolak', [], 403);
        }
      }
      const docs = await merchantService.listDocuments(id, c.env.DB);
      return successResponse(c, docs, 'Dokumen berhasil diambil');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mengambil dokumen', [], 500);
    }
  },
);

// ─── PATCH /api/merchants/documents/:docId/verify (Admin) ─────────────────────
merchantsApp.patch(
  '/documents/:docId/verify',
  authenticate,
  requireAdmin,
  async (c) => {
    const docId = Number(c.req.param('docId'));
    const actor = c.get('user');
    try {
      await merchantService.verifyDocument(docId, actor.id, c.env.DB);
      return successResponse(c, null, 'Dokumen berhasil diverifikasi');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal memverifikasi dokumen', [], 400);
    }
  },
);

// ─── POST /api/merchants/:id/bank-accounts ────────────────────────────────────
merchantsApp.post(
  '/:id/bank-accounts',
  authenticate,
  zValidator('param', IdParamsSchema),
  zValidator('json', CreateBankAccountSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data   = c.req.valid('json');
    const actor  = c.get('user');
    try {
      if (!isStaff(actor.role)) {
        const merchant = await merchantService.getMerchantById(id, c.env.DB);
        if (merchant.user_id !== actor.id) {
          return errorResponse(c, 'Akses ditolak', [], 403);
        }
      }
      const result = await merchantService.addBankAccount(id, data, actor.id, c.env.DB);
      return successResponse(c, result, 'Rekening bank berhasil ditambahkan', 201);
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal menambahkan rekening bank', [], 400);
    }
  },
);

// ─── GET /api/merchants/:id/bank-accounts ─────────────────────────────────────
merchantsApp.get(
  '/:id/bank-accounts',
  authenticate,
  zValidator('param', IdParamsSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const actor  = c.get('user');
    try {
      if (!isStaff(actor.role)) {
        const merchant = await merchantService.getMerchantById(id, c.env.DB);
        if (merchant.user_id !== actor.id) {
          return errorResponse(c, 'Akses ditolak', [], 403);
        }
      }
      const accounts = await merchantService.listBankAccounts(id, c.env.DB);
      return successResponse(c, accounts, 'Rekening bank berhasil diambil');
    } catch (err: any) {
      return errorResponse(c, err.message || 'Gagal mengambil rekening bank', [], 500);
    }
  },
);

// ─── DELETE /api/merchants/bank-accounts/:accountId ───────────────────────────
merchantsApp.delete('/bank-accounts/:accountId', authenticate, requireAdmin, async (c) => {
  const accountId = Number(c.req.param('accountId'));
  const actor     = c.get('user');
  try {
    await merchantService.deleteBankAccount(accountId, actor.id, c.env.DB);
    return successResponse(c, null, 'Rekening bank berhasil dihapus');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal menghapus rekening bank', [], 400);
  }
});

export default merchantsApp;
