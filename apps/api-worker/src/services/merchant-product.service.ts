import { MerchantProductRepository } from '../repositories/merchant-product.repository';
import { MerchantRepository } from '../repositories/merchant.repository';
import { MerchantProductCategoryRepository } from '../repositories/merchant-category.repository';
import { createAuditLog } from '../lib/audit';
import { AUDIT_ACTION, ENTITY_TYPE } from '../constants';
import type { CreateProductInput, UpdateProductInput, ProductQueryInput } from '../validators/merchant';

export class MerchantProductService {
  /**
   * Buat produk baru milik merchant.
   * Validasi: merchant harus APPROVED, SKU unik dalam merchant, category_id valid.
   */
  async createProduct(
    data: CreateProductInput,
    merchantId: number,
    actorId: number,
    db: D1Database,
  ): Promise<{ product_id: number }> {
    const productRepo  = new MerchantProductRepository(db);
    const merchantRepo = new MerchantRepository(db);
    const catRepo      = new MerchantProductCategoryRepository(db);

    // Merchant harus APPROVED
    const merchant = await merchantRepo.findById(merchantId);
    if (!merchant) throw new Error('Merchant tidak ditemukan');
    if (merchant.status !== 'APPROVED') {
      throw new Error('Merchant harus disetujui terlebih dahulu sebelum dapat menambah produk');
    }

    // Cek kategori produk valid
    const category = await catRepo.findById(data.category_id);
    if (!category || !category.is_active) {
      throw new Error('Kategori produk tidak ditemukan atau tidak aktif');
    }

    // Cek SKU unik dalam merchant
    const existingSku = await productRepo.findBySku(data.sku, merchantId);
    if (existingSku) {
      throw new Error(`SKU '${data.sku}' sudah digunakan dalam merchant ini`);
    }

    const productId = await productRepo.create({
      merchant_id:  merchantId,
      category_id:  data.category_id,
      sku:          data.sku,
      name:         data.name,
      description:  data.description,
      image_url:    data.image_url,
      price:        data.price,
      stock:        data.stock,
      weight:       data.weight,
      is_available: data.is_available,
    });

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.CREATE,
      entity_type: ENTITY_TYPE.MERCHANT_PRODUCT,
      entity_id:   productId,
      metadata:    { merchant_id: merchantId, sku: data.sku, name: data.name },
    });

    return { product_id: productId };
  }

  /**
   * Update data produk.
   */
  async updateProduct(
    productId: number,
    data: UpdateProductInput,
    actorId: number,
    db: D1Database,
  ): Promise<void> {
    const productRepo = new MerchantProductRepository(db);
    const product = await productRepo.findById(productId);
    if (!product) throw new Error('Produk tidak ditemukan');

    await productRepo.update(productId, data);

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.UPDATE,
      entity_type: ENTITY_TYPE.MERCHANT_PRODUCT,
      entity_id:   productId,
      metadata:    { updated_fields: Object.keys(data) },
    });
  }

  /**
   * Soft delete produk.
   */
  async deleteProduct(productId: number, actorId: number, db: D1Database): Promise<void> {
    const productRepo = new MerchantProductRepository(db);
    const product = await productRepo.findById(productId);
    if (!product) throw new Error('Produk tidak ditemukan');

    await productRepo.softDelete(productId);

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.DELETE,
      entity_type: ENTITY_TYPE.MERCHANT_PRODUCT,
      entity_id:   productId,
      metadata:    { merchant_id: product.merchant_id, name: product.name },
    });
  }

  /**
   * Ambil detail produk berdasarkan ID.
   */
  async getProductById(productId: number, db: D1Database) {
    const productRepo = new MerchantProductRepository(db);
    const product = await productRepo.findById(productId);
    if (!product) throw new Error('Produk tidak ditemukan');
    return product;
  }

  /**
   * List produk dengan pagination dan filter.
   */
  async listProducts(query: ProductQueryInput, db: D1Database) {
    const productRepo = new MerchantProductRepository(db);
    return productRepo.list(
      query.page,
      query.limit,
      query.merchant_id,
      query.category_id,
      query.is_available,
      query.search,
    );
  }
}
