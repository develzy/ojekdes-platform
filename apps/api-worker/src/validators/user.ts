import { z } from 'zod';
import { PaginationSchema } from './common';

export const UpdateUserSchema = z.object({
  email: z.string().email('Format email tidak valid').optional().nullable(),
  fullName: z.string().min(3, 'Nama lengkap minimal 3 karakter').max(100).optional(),
  avatarUrl: z.string().url('Format URL avatar tidak valid').optional().nullable(),
  isActive: z.coerce.number().int().min(0).max(1).optional(),
});

export const ListUsersQuerySchema = PaginationSchema.extend({
  role: z.enum(['super_admin', 'admin', 'operator', 'customer', 'driver']).optional(),
});
