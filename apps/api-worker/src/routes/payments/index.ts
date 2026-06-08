import { Hono } from 'hono';
import { successResponse } from '../../lib/response';

const paymentsApp = new Hono();

paymentsApp.get('/', (c) => {
  return successResponse(c, [], 'Payments placeholder (Phase 2)');
});

export default paymentsApp;
