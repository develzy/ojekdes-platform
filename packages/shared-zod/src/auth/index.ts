import { z } from 'zod';

export const LoginSchema = z.object({
  phone: z.string()
    .min(10, 'Nomor telepon minimal 10 digit')
    .max(15, 'Nomor telepon maksimal 15 digit')
    .regex(/^[0-9]+$/, 'Nomor telepon hanya boleh berisi angka'),
  password: z.string()
    .min(6, 'Password minimal 6 karakter'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  phone: z.string()
    .min(10, 'Nomor telepon minimal 10 digit')
    .max(15, 'Nomor telepon maksimal 15 digit')
    .regex(/^[0-9]+$/, 'Nomor telepon hanya boleh berisi angka'),
  email: z.string()
    .email('Format email tidak valid')
    .optional()
    .or(z.literal('')),
  full_name: z.string()
    .min(3, 'Nama lengkap minimal 3 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
  password: z.string()
    .min(6, 'Password minimal 6 karakter'),
  role_id: z.number()
    .int()
    .positive('ID role harus valid'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenRequestInput = z.infer<typeof RefreshTokenRequestSchema>;

