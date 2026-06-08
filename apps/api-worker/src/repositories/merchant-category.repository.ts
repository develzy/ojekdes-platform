import { dbQuery, dbQueryFirst, dbRun } from '../lib/db';
import type {
  MerchantCategory,
  MerchantProductCategory,
} from '@ojekdes/shared-types';

// ─── Merchant Category Repository ─────────────────────────────────────────────

export class MerchantCategoryRepository {
  constructor(private readonly db: D1Database) {}

  async findAll(activeOnly = true): Promise<MerchantCategory[]> {
    const filter = activeOnly ? 'WHERE is_active = 1' : '';
    return dbQuery<MerchantCategory>(
      this.db,
      `SELECT * FROM merchant_categories ${filter} ORDER BY name ASC`,
      [],
    );
  }

  async findById(id: number): Promise<MerchantCategory | null> {
    return dbQueryFirst<MerchantCategory>(
      this.db,
      `SELECT * FROM merchant_categories WHERE id = ? LIMIT 1`,
      [id],
    );
  }

  async findByCode(code: string): Promise<MerchantCategory | null> {
    return dbQueryFirst<MerchantCategory>(
      this.db,
      `SELECT * FROM merchant_categories WHERE code = ? LIMIT 1`,
      [code],
    );
  }
}

// ─── Merchant Product Category Repository ─────────────────────────────────────

export class MerchantProductCategoryRepository {
  constructor(private readonly db: D1Database) {}

  async findAll(activeOnly = true): Promise<MerchantProductCategory[]> {
    const filter = activeOnly ? 'WHERE is_active = 1' : '';
    return dbQuery<MerchantProductCategory>(
      this.db,
      `SELECT * FROM merchant_product_categories ${filter} ORDER BY name ASC`,
      [],
    );
  }

  async findById(id: number): Promise<MerchantProductCategory | null> {
    return dbQueryFirst<MerchantProductCategory>(
      this.db,
      `SELECT * FROM merchant_product_categories WHERE id = ? LIMIT 1`,
      [id],
    );
  }

  async findByBusinessCategory(merchantCategoryId: number): Promise<MerchantProductCategory[]> {
    return dbQuery<MerchantProductCategory>(
      this.db,
      `SELECT * FROM merchant_product_categories
       WHERE (merchant_category_id = ? OR merchant_category_id IS NULL)
         AND is_active = 1
       ORDER BY name ASC`,
      [merchantCategoryId],
    );
  }
}
