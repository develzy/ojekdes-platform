import { z } from 'zod';
import { PaginationSchema } from './common';

// ─── Merchant ─────────────────────────────────────────────────────────────────

export const CreateMerchantSchema = z.object({
  category_id:   z.number().int().positive('category_id harus berupa angka positif'),
  business_name: z.string().min(3, 'Nama usaha minimal 3 karakter').max(100),
  owner_name:    z.string().min(3, 'Nama pemilik minimal 3 karakter').max(100),
  phone:         z.string().regex(/^08\d{8,11}$/, 'Format nomor HP tidak valid'),
  email:         z.string().email('Format email tidak valid').optional().nullable(),
  description:   z.string().max(500).optional().nullable(),
  logo_url:      z.string().url('logo_url harus berupa URL valid').optional().nullable(),
  banner_url:    z.string().url('banner_url harus berupa URL valid').optional().nullable(),
});

export type CreateMerchantInput = z.infer<typeof CreateMerchantSchema>;

export const UpdateMerchantSchema = CreateMerchantSchema.partial();

export type UpdateMerchantInput = z.infer<typeof UpdateMerchantSchema>;

export const UpdateMerchantStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED'], {
    errorMap: () => ({ message: 'Status harus salah satu: APPROVED, REJECTED, SUSPENDED' }),
  }),
  reason: z.string().max(500).optional().nullable(),
});

export type UpdateMerchantStatusInput = z.infer<typeof UpdateMerchantStatusSchema>;

export const MerchantQuerySchema = PaginationSchema.extend({
  status:      z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  search:      z.string().optional(),
});

export type MerchantQueryInput = z.infer<typeof MerchantQuerySchema>;

// ─── Merchant Document ────────────────────────────────────────────────────────

export const UploadDocumentSchema = z.object({
  document_type: z.enum(['KTP', 'NPWP', 'NIB', 'SIUP', 'FOTO_TOKO'], {
    errorMap: () => ({ message: 'document_type harus salah satu: KTP, NPWP, NIB, SIUP, FOTO_TOKO' }),
  }),
  document_url: z.string().url('document_url harus berupa URL valid'),
});

export type UploadDocumentInput = z.infer<typeof UploadDocumentSchema>;

// ─── Merchant Bank Account ────────────────────────────────────────────────────

export const CreateBankAccountSchema = z.object({
  bank_name:      z.string().min(2, 'Nama bank minimal 2 karakter').max(100),
  account_number: z.string().min(6, 'Nomor rekening minimal 6 karakter').max(30),
  account_holder: z.string().min(3, 'Nama pemilik rekening minimal 3 karakter').max(100),
  is_primary:     z.number().int().min(0).max(1).default(1),
});

export type CreateBankAccountInput = z.infer<typeof CreateBankAccountSchema>;

// ─── Merchant Branch ──────────────────────────────────────────────────────────

export const CreateBranchSchema = z.object({
  branch_name:    z.string().min(3).max(100),
  address:        z.string().min(5).max(255),
  village_id:     z.number().int().positive().optional().nullable(),
  hamlet_id:      z.number().int().positive().optional().nullable(),
  latitude:       z.number().min(-90).max(90).optional().nullable(),
  longitude:      z.number().min(-180).max(180).optional().nullable(),
  is_main_branch: z.number().int().min(0).max(1).default(0),
});

export type CreateBranchInput = z.infer<typeof CreateBranchSchema>;

// ─── Merchant Product ─────────────────────────────────────────────────────────

export const CreateProductSchema = z.object({
  category_id:  z.number().int().positive('category_id harus berupa angka positif'),
  sku:          z.string().min(2).max(50),
  name:         z.string().min(2, 'Nama produk minimal 2 karakter').max(150),
  description:  z.string().max(1000).optional().nullable(),
  image_url:    z.string().url('image_url harus berupa URL valid').optional().nullable(),
  price:        z.number().int().min(0, 'Harga tidak boleh negatif'),
  stock:        z.number().int().min(0, 'Stok tidak boleh negatif').default(0),
  weight:       z.number().int().min(0, 'Berat tidak boleh negatif').default(0),
  is_available: z.number().int().min(0).max(1).default(1),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();

export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

export const ProductQuerySchema = PaginationSchema.extend({
  merchant_id:  z.coerce.number().int().positive().optional(),
  category_id:  z.coerce.number().int().positive().optional(),
  is_available: z.coerce.number().int().min(0).max(1).optional(),
  search:       z.string().optional(),
});

export type ProductQueryInput = z.infer<typeof ProductQuerySchema>;

// ─── Merchant Order ───────────────────────────────────────────────────────────

export const OrderItemSchema = z.object({
  product_id: z.number().int().positive('product_id harus berupa angka positif'),
  quantity:   z.number().int().min(1, 'Quantity minimal 1'),
});

export const CreateMerchantOrderSchema = z.object({
  merchant_id: z.number().int().positive('merchant_id harus berupa angka positif'),
  branch_id:   z.number().int().positive().optional().nullable(),
  items:       z.array(OrderItemSchema).min(1, 'Order harus memiliki minimal 1 item'),
  notes:       z.string().max(500).optional().nullable(),
  delivery_fee: z.number().int().min(0).default(0),
});

export type CreateMerchantOrderInput = z.infer<typeof CreateMerchantOrderSchema>;

export const UpdateMerchantOrderStatusSchema = z.object({
  status: z.enum(
    ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERED', 'CANCELLED'],
    { errorMap: () => ({ message: 'Status order tidak valid' }) },
  ),
  notes: z.string().max(500).optional().nullable(),
});

export type UpdateMerchantOrderStatusInput = z.infer<typeof UpdateMerchantOrderStatusSchema>;

export const MerchantOrderQuerySchema = PaginationSchema.extend({
  merchant_id:  z.coerce.number().int().positive().optional(),
  customer_id:  z.coerce.number().int().positive().optional(),
  driver_id:    z.coerce.number().int().positive().optional(),
  status:       z.enum([
    'PENDING','CONFIRMED','PREPARING',
    'READY_FOR_PICKUP','PICKED_UP','DELIVERED','CANCELLED',
  ]).optional(),
});

export type MerchantOrderQueryInput = z.infer<typeof MerchantOrderQuerySchema>;
