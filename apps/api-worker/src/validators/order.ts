import { z } from 'zod';
import { PaginationSchema } from './common';

// ─── Common sub-schemas ───────────────────────────────────────────────────────

const LatLngSchema = z.object({
  latitude:  z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const PickupSchema = z.object({
  pickup_name:      z.string().max(100).optional().nullable(),
  pickup_phone:     z.string().regex(/^08\d{8,11}$/, 'Format nomor HP pickup tidak valid').optional().nullable(),
  pickup_address:   z.string().min(5, 'Alamat pickup minimal 5 karakter').max(255),
  pickup_latitude:  z.number().min(-90).max(90),
  pickup_longitude: z.number().min(-180).max(180),
});

const DestinationSchema = z.object({
  destination_name:      z.string().max(100).optional().nullable(),
  destination_phone:     z.string().regex(/^08\d{8,11}$/, 'Format nomor HP tujuan tidak valid').optional().nullable(),
  destination_address:   z.string().min(5, 'Alamat tujuan minimal 5 karakter').max(255),
  destination_latitude:  z.number().min(-90).max(90),
  destination_longitude: z.number().min(-180).max(180),
});

// ─── Create Orders ────────────────────────────────────────────────────────────

export const CreateRideOrderSchema = PickupSchema.merge(DestinationSchema).extend({
  payment_method:  z.enum(['CASH', 'WALLET', 'MIDTRANS']).default('CASH'),
  notes:           z.string().max(500).optional().nullable(),
  distance_km:     z.number().min(0).default(0),
  duration_minutes: z.number().int().min(0).default(0),
  estimated_price: z.number().int().min(0).default(0),
});

export type CreateRideOrderInput = z.infer<typeof CreateRideOrderSchema>;

export const CreateCourierOrderSchema = PickupSchema.merge(DestinationSchema).extend({
  payment_method:   z.enum(['CASH', 'WALLET', 'MIDTRANS']).default('CASH'),
  notes:            z.string().max(500).optional().nullable(),
  distance_km:      z.number().min(0).default(0),
  duration_minutes: z.number().int().min(0).default(0),
  estimated_price:  z.number().int().min(0).default(0),
  destination_name:  z.string().min(2, 'Nama penerima wajib diisi').max(100),
  destination_phone: z.string().regex(/^08\d{8,11}$/, 'Nomor HP penerima wajib valid'),
});

export type CreateCourierOrderInput = z.infer<typeof CreateCourierOrderSchema>;

// ─── Driver Assignment ────────────────────────────────────────────────────────

export const AssignDriverSchema = z.object({
  driver_id: z.number().int().positive('driver_id harus berupa angka positif'),
});

export type AssignDriverInput = z.infer<typeof AssignDriverSchema>;

export const AcceptAssignmentSchema = z.object({}).optional();

export const RejectAssignmentSchema = z.object({
  reason: z.string().max(255).optional().nullable(),
});

export type RejectAssignmentInput = z.infer<typeof RejectAssignmentSchema>;

// ─── Update Status ────────────────────────────────────────────────────────────

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(
    ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'ON_TRIP', 'DELIVERED', 'COMPLETED'],
    { errorMap: () => ({ message: 'Status order tidak valid' }) },
  ),
  notes: z.string().max(500).optional().nullable(),
});

export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;

// ─── Tracking ─────────────────────────────────────────────────────────────────

export const OrderTrackingSchema = z.object({
  latitude:  z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy:  z.number().min(0).optional().nullable(),
});

export type OrderTrackingInput = z.infer<typeof OrderTrackingSchema>;

// ─── Cancel ───────────────────────────────────────────────────────────────────

export const CancelOrderSchema = z.object({
  reason: z.string().min(5, 'Alasan pembatalan minimal 5 karakter').max(500),
});

export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;

// ─── Rating ───────────────────────────────────────────────────────────────────

export const CreateRatingSchema = z.object({
  rating: z.number().int().min(1, 'Rating minimal 1').max(5, 'Rating maksimal 5'),
  review: z.string().max(500).optional().nullable(),
});

export type CreateRatingInput = z.infer<typeof CreateRatingSchema>;

// ─── Proof ────────────────────────────────────────────────────────────────────

export const UploadProofSchema = z.object({
  proof_type: z.enum(['PICKUP', 'DELIVERY'], {
    errorMap: () => ({ message: 'proof_type harus PICKUP atau DELIVERY' }),
  }),
  image_url: z.string().url('image_url harus berupa URL valid'),
});

export type UploadProofInput = z.infer<typeof UploadProofSchema>;

// ─── Query ────────────────────────────────────────────────────────────────────

export const OrderQuerySchema = PaginationSchema.extend({
  status:       z.enum([
    'SEARCHING_DRIVER','DRIVER_ASSIGNED','DRIVER_ARRIVED',
    'ON_TRIP','DELIVERED','COMPLETED','CANCELLED',
  ]).optional(),
  service_type: z.enum(['RIDE', 'COURIER', 'MERCHANT']).optional(),
  customer_id:  z.coerce.number().int().positive().optional(),
  driver_id:    z.coerce.number().int().positive().optional(),
  merchant_id:  z.coerce.number().int().positive().optional(),
});

export type OrderQueryInput = z.infer<typeof OrderQuerySchema>;
