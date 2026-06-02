import { z } from 'zod';

export const PaymentSchema = z.object({
  order_id: z.number()
    .int()
    .positive('ID order harus valid'),
  amount: z.number()
    .int()
    .positive('Jumlah pembayaran harus valid'),
  payment_method: z.enum(['CASH', 'QRIS'], {
    errorMap: () => ({ message: 'Metode pembayaran tidak valid' }),
  }),
});

export type PaymentInput = z.infer<typeof PaymentSchema>;
