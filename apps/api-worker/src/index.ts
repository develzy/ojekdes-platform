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
// Phase 2A — Merchant Module
import merchantCategoriesApp from './routes/merchant-categories';
import merchantsApp from './routes/merchants';
import merchantProductsApp from './routes/merchant-products';
import merchantOrdersApp from './routes/merchant-orders';
// Phase 2C — Driver Matching Engine
import driverMatchingApp from './routes/driver-matching';
import { MerchantProductCategoryRepository } from './repositories/merchant-category.repository';
import { successResponse } from './lib/response';
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

// Mount routes — Phase 2C: Driver Matching Engine
app.route('/api', driverMatchingApp);

// Mount routes — Phase 1
app.route('/api/auth', authApp);
app.route('/api/users', usersApp);
app.route('/api/drivers', driversApp);
app.route('/api/customers', customersApp);
app.route('/api/locations', locationsApp);
app.route('/api/orders', ordersApp);
app.route('/api/payments', paymentsApp);
app.route('/api/wallets', walletsApp);

// Mount routes — Phase 2A: Merchant Module
app.route('/api/merchant-categories', merchantCategoriesApp);
app.route('/api/merchants', merchantsApp);
app.route('/api/merchant-products', merchantProductsApp);
app.route('/api/merchant-orders', merchantOrdersApp);

// GET /api/merchant-product-categories — public shortcut list semua product categories
app.get('/api/merchant-product-categories', async (c) => {
  try {
    const repo = new MerchantProductCategoryRepository(c.env.DB);
    const categories = await repo.findAll(true);
    return successResponse(c, categories, 'Kategori produk berhasil diambil');
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil kategori produk', [], 500);
  }
});

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
