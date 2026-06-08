import { Hono } from 'hono';
import { successResponse } from '../../lib/response';

const ordersApp = new Hono();

ordersApp.get('/', (c) => {
  return successResponse(c, [], 'Orders placeholder (Phase 2)');
});

export default ordersApp;
