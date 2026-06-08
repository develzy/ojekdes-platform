import { Hono } from 'hono';
import { successResponse } from '../../lib/response';

const walletsApp = new Hono();

walletsApp.get('/', (c) => {
  return successResponse(c, [], 'Wallets placeholder (Phase 2)');
});

export default walletsApp;
