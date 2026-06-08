import { z } from 'zod';

export const CreatePaymentSchema = z.object({
  order_id: z.number().int().positive().optional().nullable(),
  merchant_order_id: z.number().int().positive().optional().nullable(),
  payment_method: z.enum(['CASH', 'WALLET', 'QRIS', 'BANK_TRANSFER', 'GOPAY', 'SHOPEEPAY']),
  gross_amount: z.number().int().positive('Jumlah pembayaran harus positif'),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

export const TopupWalletSchema = z.object({
  amount: z.number().int().min(10000, 'Minimal topup adalah Rp10.000'),
  payment_method: z.enum(['QRIS', 'BANK_TRANSFER', 'GOPAY', 'SHOPEEPAY']),
});

export type TopupWalletInput = z.infer<typeof TopupWalletSchema>;

export const WithdrawWalletSchema = z.object({
  amount: z.number().int().min(10000, 'Minimal penarikan adalah Rp10.000'),
  bank_account_id: z.number().int().positive('ID rekening bank tidak valid'),
});

export type WithdrawWalletInput = z.infer<typeof WithdrawWalletSchema>;

export const PaymentCallbackSchema = z.object({
  order_id: z.string(),
  transaction_status: z.string(),
  status_code: z.string(),
  gross_amount: z.string(),
  signature_key: z.string(),
  payment_type: z.string().optional().nullable(),
  transaction_id: z.string().optional().nullable(),
});

export type PaymentCallbackInput = z.infer<typeof PaymentCallbackSchema>;
