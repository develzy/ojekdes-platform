import { z } from 'zod';
import { PaginationSchema } from './common';

export const UpdateDriverStatusSchema = z.object({
  status: z.enum(['OFFLINE', 'ONLINE', 'BUSY', 'SUSPENDED']),
});

export const ListDriversQuerySchema = PaginationSchema.extend({
  status: z.enum(['OFFLINE', 'ONLINE', 'BUSY', 'SUSPENDED']).optional(),
});
