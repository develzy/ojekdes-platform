import { Hono } from 'hono';
import { loggerMiddleware } from './middleware/logger';
import { corsMiddleware } from './middleware/cors';
import { securityMiddleware } from './middleware/security';
import { errorResponse } from './lib/response';
import authApp from './routes/auth';
import usersApp from './routes/users';
import driversApp from './routes/drivers';
import customersApp from './routes/customers';
import locationsApp from './routes/locations';
import ordersApp from './routes/orders';
import paymentsApp from './routes/payments';
import walletsApp from './routes/wallets';
import type { Env } from './types/bindings';
import type { Variables } from './types/context';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global Middleware
app.use('*', loggerMiddleware);
app.use('*', corsMiddleware);
app.use('*', securityMiddleware);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.route('/api/auth', authApp);
app.route('/api/users', usersApp);
app.route('/api/drivers', driversApp);
app.route('/api/customers', customersApp);
app.route('/api/locations', locationsApp);
app.route('/api/orders', ordersApp);
app.route('/api/payments', paymentsApp);
app.route('/api/wallets', walletsApp);

// Global Error Handler
app.onError((err, c) => {
  console.error('[GLOBAL ERROR]', err);
  return errorResponse(c, err.message || 'Internal Server Error', [], 500);
});

// 404 Handler
app.notFound((c) => {
  return errorResponse(c, 'Endpoint tidak ditemukan', [], 404);
});

export default app;
