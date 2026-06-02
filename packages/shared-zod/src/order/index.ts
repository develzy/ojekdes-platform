import { z } from 'zod';

export const CreateOrderSchema = z.object({
  service_type: z.enum(['MOTOR', 'BENTOR', 'PELAJAR'], {
    errorMap: () => ({ message: 'Tipe layanan tidak valid' }),
  }),
  payment_method: z.enum(['CASH', 'QRIS'], {
    errorMap: () => ({ message: 'Metode pembayaran tidak valid' }),
  }),
  pickup_address: z.string()
    .min(5, 'Alamat penjemputan minimal 5 karakter'),
  pickup_latitude: z.number()
    .min(-90)
    .max(90),
  pickup_longitude: z.number()
    .min(-180)
    .max(180),
  pickup_village_id: z.number()
    .int()
    .positive('Desa penjemputan tidak valid'),
  dropoff_address: z.string()
    .min(5, 'Alamat tujuan minimal 5 karakter'),
  dropoff_latitude: z.number()
    .min(-90)
    .max(90),
  dropoff_longitude: z.number()
    .min(-180)
    .max(180),
  dropoff_village_id: z.number()
    .int()
    .positive('Desa tujuan tidak valid'),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
