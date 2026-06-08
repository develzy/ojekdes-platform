import { z } from 'zod';
import { LoginSchema, RefreshTokenRequestSchema } from '@ojekdes/shared-zod';

export { LoginSchema, RefreshTokenRequestSchema };

export const RegisterSchema = z.object({
  phone: z.string()
    .min(10, 'Nomor telepon minimal 10 digit')
    .max(15, 'Nomor telepon maksimal 15 digit')
    .regex(/^[0-9]+$/, 'Nomor telepon hanya boleh berisi angka'),
  email: z.string()
    .email('Format email tidak valid')
    .optional()
    .nullable()
    .or(z.literal('')),
  full_name: z.string()
    .min(3, 'Nama lengkap minimal 3 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
  password: z.string()
    .min(6, 'Password minimal 6 karakter'),
  role: z.enum(['super_admin', 'admin', 'operator', 'customer', 'driver']),
  license_number: z.string().min(3, 'Nomor SIM wajib diisi untuk driver').optional().nullable(),
});
