import { z } from 'zod';
import { PaginationSchema } from './common';

export const UpdateDriverLocationSchema = z.object({
  latitude:  z.number().min(-90, 'Latitude harus di antara -90 dan 90').max(90, 'Latitude harus di antara -90 dan 90'),
  longitude: z.number().min(-180, 'Longitude harus di antara -180 dan 180').max(180, 'Longitude harus di antara -180 dan 180'),
  accuracy:  z.number().min(0).optional().nullable(),
});

export type UpdateDriverLocationInput = z.infer<typeof UpdateDriverLocationSchema>;

export const UpdateDriverOnlineStatusSchema = z.object({
  is_online: z.boolean(),
});

export type UpdateDriverOnlineStatusInput = z.infer<typeof UpdateDriverOnlineStatusSchema>;

export const BroadcastOrderSchema = z.object({
  max_radius_km: z.number().positive('max_radius_km harus lebih besar dari 0').default(5),
});

export type BroadcastOrderInput = z.infer<typeof BroadcastOrderSchema>;

export const AcceptOrderSchema = z.object({}).optional();

export const RejectOrderSchema = z.object({
  reason: z.string().max(255).optional().nullable(),
});

export type RejectOrderInput = z.infer<typeof RejectOrderSchema>;

export const NearbyDriverQuerySchema = PaginationSchema.extend({
  latitude:      z.coerce.number().min(-90, 'Latitude harus di antara -90 dan 90').max(90, 'Latitude harus di antara -90 dan 90'),
  longitude:     z.coerce.number().min(-180, 'Longitude harus di antara -180 dan 180').max(180, 'Longitude harus di antara -180 dan 180'),
  max_radius_km: z.coerce.number().positive('max_radius_km harus lebih besar dari 0').default(5),
});

export type NearbyDriverQueryInput = z.infer<typeof NearbyDriverQuerySchema>;
