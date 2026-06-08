import { dbQuery, dbQueryFirst, dbRun } from '../lib/db';
import type { MerchantProduct, MerchantProductWithCategory } from '@ojekdes/shared-types';

// ─── Helper ───────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class MerchantProductRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Cari produk berdasarkan ID beserta info kategori produk.
   */
  async findById(id: number): Promise<MerchantProductWithCategory | null> {
    return dbQueryFirst<MerchantProductWithCategory>(
      this.db,
      `SELECT mp.*, mpc.name AS category_name, mpc.code AS category_code
       FROM merchant_products mp
       JOIN merchant_product_categories mpc ON mpc.id = mp.category_id
       WHERE mp.id = ? AND mp.deleted_at IS NULL
       LIMIT 1`,
      [id],
    );
  }

  /**
   * Cari produk berdasarkan SKU dalam satu merchant.
   */
  async findBySku(sku: string, merchantId: number): Promise<MerchantProduct | null> {
    return dbQueryFirst<MerchantProduct>(
      this.db,
      `SELECT * FROM merchant_products WHERE sku = ? AND merchant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [sku, merchantId],
    );
  }

  /**
   * Buat produk baru. Auto-generate slug dari nama.
   * Returns ID produk baru.
   */
  async create(data: {
    merchant_id: number;
    category_id: number;
    sku: string;
    name: string;
    description?: string | null;
    image_url?: string | null;
    price: number;
    stock: number;
    weight: number;
    is_available: number;
  }): Promise<number> {
    const baseSlug = generateSlug(data.name);
    // Pastikan slug unik dengan tambah suffix angka jika perlu
    let slug = baseSlug;
    let suffix = 1;
    while (true) {
      const existing = await dbQueryFirst<{ id: number }>(
        this.db,
        `SELECT id FROM merchant_products WHERE slug = ? AND deleted_at IS NULL LIMIT 1`,
        [slug],
      );
      if (!existing) break;
      slug = `${baseSlug}-${suffix++}`;
    }

    const result = await dbRun(
      this.db,
      `INSERT INTO merchant_products
         (merchant_id, category_id, sku, name, slug, description, image_url, price, stock, weight, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.merchant_id,
        data.category_id,
        data.sku,
        data.name,
        slug,
        data.description ?? null,
        data.image_url ?? null,
        data.price,
        data.stock,
        data.weight,
        data.is_available,
      ],
    );
    return result.meta.last_row_id as number;
  }

  /**
   * Update produk.
   */
  async update(
    id: number,
    data: Partial<{
      category_id: number;
      name: string;
      description: string | null;
      image_url: string | null;
      price: number;
      stock: number;
      weight: number;
      is_available: number;
    }>,
  ): Promise<void> {
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.category_id  !== undefined) { fields.push('category_id = ?');  params.push(data.category_id); }
    if (data.name         !== undefined) {
      fields.push('name = ?');
      fields.push('slug = ?');
      params.push(data.name);
      params.push(generateSlug(data.name));
    }
    if (data.description  !== undefined) { fields.push('description = ?');  params.push(data.description); }
    if (data.image_url    !== undefined) { fields.push('image_url = ?');    params.push(data.image_url); }
    if (data.price        !== undefined) { fields.push('price = ?');        params.push(data.price); }
    if (data.stock        !== undefined) { fields.push('stock = ?');        params.push(data.stock); }
    if (data.weight       !== undefined) { fields.push('weight = ?');       params.push(data.weight); }
    if (data.is_available !== undefined) { fields.push('is_available = ?'); params.push(data.is_available); }

    if (fields.length === 0) return;
    fields.push(`updated_at = datetime('now', 'utc')`);
    params.push(id);

    await dbRun(
      this.db,
      `UPDATE merchant_products SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      params,
    );
  }

  /**
   * Soft delete produk.
   */
  async softDelete(id: number): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE merchant_products SET deleted_at = datetime('now', 'utc'), updated_at = datetime('now', 'utc') WHERE id = ?`,
      [id],
    );
  }

  /**
   * List produk dengan pagination dan filter.
   */
  async list(
    page: number,
    limit: number,
    merchantId?: number,
    categoryId?: number,
    isAvailable?: number,
    search?: string,
  ): Promise<{ products: MerchantProductWithCategory[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = ['mp.deleted_at IS NULL'];
    const params: (string | number)[] = [];

    if (merchantId  !== undefined) { conditions.push('mp.merchant_id = ?');  params.push(merchantId); }
    if (categoryId  !== undefined) { conditions.push('mp.category_id = ?');  params.push(categoryId); }
    if (isAvailable !== undefined) { conditions.push('mp.is_available = ?'); params.push(isAvailable); }
    if (search) {
      conditions.push('(mp.name LIKE ? OR mp.sku LIKE ? OR mp.description LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [products, countResult] = await Promise.all([
      dbQuery<MerchantProductWithCategory>(
        this.db,
        `SELECT mp.*, mpc.name AS category_name, mpc.code AS category_code
         FROM merchant_products mp
         JOIN merchant_product_categories mpc ON mpc.id = mp.category_id
         ${where}
         ORDER BY mp.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
      dbQueryFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM merchant_products mp ${where}`,
        params,
      ),
    ]);

    return { products, total: countResult?.count ?? 0 };
  }
}
