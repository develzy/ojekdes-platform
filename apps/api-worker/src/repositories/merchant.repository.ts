import { dbQuery, dbQueryFirst, dbRun } from '../lib/db';
import type {
  Merchant,
  MerchantWithCategory,
  MerchantDocument,
  MerchantBankAccount,
  MerchantBranch,
  MerchantOperatingHours,
} from '@ojekdes/shared-types';

// ─── Helper ───────────────────────────────────────────────────────────────────

function generateMerchantCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MDe-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class MerchantRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Ambil merchant berdasarkan ID beserta info kategori usaha.
   */
  async findById(id: number): Promise<MerchantWithCategory | null> {
    return dbQueryFirst<MerchantWithCategory>(
      this.db,
      `SELECT m.*, mc.name AS category_name, mc.code AS category_code, mc.icon AS category_icon
       FROM merchants m
       JOIN merchant_categories mc ON mc.id = m.category_id
       WHERE m.id = ? AND m.deleted_at IS NULL
       LIMIT 1`,
      [id],
    );
  }

  /**
   * Ambil merchant berdasarkan user_id (pemilik merchant).
   */
  async findByUserId(userId: number): Promise<MerchantWithCategory | null> {
    return dbQueryFirst<MerchantWithCategory>(
      this.db,
      `SELECT m.*, mc.name AS category_name, mc.code AS category_code, mc.icon AS category_icon
       FROM merchants m
       JOIN merchant_categories mc ON mc.id = m.category_id
       WHERE m.user_id = ? AND m.deleted_at IS NULL
       LIMIT 1`,
      [userId],
    );
  }

  /**
   * Cari merchant berdasarkan merchant_code unik.
   */
  async findByCode(code: string): Promise<Merchant | null> {
    return dbQueryFirst<Merchant>(
      this.db,
      `SELECT * FROM merchants WHERE merchant_code = ? AND deleted_at IS NULL LIMIT 1`,
      [code],
    );
  }

  /**
   * Buat merchant baru. Returns ID merchant baru.
   */
  async create(data: {
    user_id: number;
    category_id: number;
    business_name: string;
    owner_name: string;
    phone: string;
    email?: string | null;
    description?: string | null;
    logo_url?: string | null;
    banner_url?: string | null;
  }): Promise<number> {
    // Generate unique merchant_code, retry jika collision
    let merchantCode: string;
    let attempt = 0;
    do {
      merchantCode = generateMerchantCode();
      const existing = await this.findByCode(merchantCode);
      if (!existing) break;
      attempt++;
    } while (attempt < 5);

    const result = await dbRun(
      this.db,
      `INSERT INTO merchants
         (user_id, category_id, merchant_code, business_name, owner_name, phone, email, description, logo_url, banner_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.category_id,
        merchantCode!,
        data.business_name,
        data.owner_name,
        data.phone,
        data.email ?? null,
        data.description ?? null,
        data.logo_url ?? null,
        data.banner_url ?? null,
      ],
    );
    return result.meta.last_row_id as number;
  }

  /**
   * Update data merchant.
   */
  async update(
    id: number,
    data: Partial<{
      category_id: number;
      business_name: string;
      owner_name: string;
      phone: string;
      email: string | null;
      description: string | null;
      logo_url: string | null;
      banner_url: string | null;
    }>,
  ): Promise<void> {
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.category_id   !== undefined) { fields.push('category_id = ?');   params.push(data.category_id); }
    if (data.business_name !== undefined) { fields.push('business_name = ?'); params.push(data.business_name); }
    if (data.owner_name    !== undefined) { fields.push('owner_name = ?');    params.push(data.owner_name); }
    if (data.phone         !== undefined) { fields.push('phone = ?');         params.push(data.phone); }
    if (data.email         !== undefined) { fields.push('email = ?');         params.push(data.email); }
    if (data.description   !== undefined) { fields.push('description = ?');   params.push(data.description); }
    if (data.logo_url      !== undefined) { fields.push('logo_url = ?');      params.push(data.logo_url); }
    if (data.banner_url    !== undefined) { fields.push('banner_url = ?');    params.push(data.banner_url); }

    if (fields.length === 0) return;
    fields.push(`updated_at = datetime('now', 'utc')`);
    params.push(id);

    await dbRun(
      this.db,
      `UPDATE merchants SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      params,
    );
  }

  /**
   * Update status merchant (PENDING/APPROVED/REJECTED/SUSPENDED).
   */
  async updateStatus(
    id: number,
    status: string,
    verifiedBy?: number | null,
  ): Promise<void> {
    const isApproval = status === 'APPROVED';
    await dbRun(
      this.db,
      `UPDATE merchants
       SET status = ?,
           verified_by = ?,
           verified_at = ${isApproval ? `datetime('now', 'utc')` : 'NULL'},
           updated_at  = datetime('now', 'utc')
       WHERE id = ? AND deleted_at IS NULL`,
      [status, verifiedBy ?? null, id],
    );
  }

  /**
   * Soft delete merchant.
   */
  async softDelete(id: number): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE merchants SET deleted_at = datetime('now', 'utc'), updated_at = datetime('now', 'utc') WHERE id = ?`,
      [id],
    );
  }

  /**
   * List merchants dengan pagination dan filter opsional.
   */
  async list(
    page: number,
    limit: number,
    status?: string,
    categoryId?: number,
    search?: string,
  ): Promise<{ merchants: MerchantWithCategory[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = ['m.deleted_at IS NULL'];
    const params: (string | number)[] = [];

    if (status)     { conditions.push('m.status = ?');      params.push(status); }
    if (categoryId) { conditions.push('m.category_id = ?'); params.push(categoryId); }
    if (search) {
      conditions.push('(m.business_name LIKE ? OR m.owner_name LIKE ? OR m.merchant_code LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [merchants, countResult] = await Promise.all([
      dbQuery<MerchantWithCategory>(
        this.db,
        `SELECT m.*, mc.name AS category_name, mc.code AS category_code, mc.icon AS category_icon
         FROM merchants m
         JOIN merchant_categories mc ON mc.id = m.category_id
         ${where}
         ORDER BY m.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
      dbQueryFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM merchants m ${where}`,
        params,
      ),
    ]);

    return { merchants, total: countResult?.count ?? 0 };
  }
}

// ─── Merchant Document Repository ─────────────────────────────────────────────

export class MerchantDocumentRepository {
  constructor(private readonly db: D1Database) {}

  async findByMerchantId(merchantId: number): Promise<MerchantDocument[]> {
    return dbQuery<MerchantDocument>(
      this.db,
      `SELECT * FROM merchant_documents WHERE merchant_id = ? ORDER BY created_at DESC`,
      [merchantId],
    );
  }

  async findById(id: number): Promise<MerchantDocument | null> {
    return dbQueryFirst<MerchantDocument>(
      this.db,
      `SELECT * FROM merchant_documents WHERE id = ? LIMIT 1`,
      [id],
    );
  }

  async create(data: {
    merchant_id: number;
    document_type: string;
    document_url: string;
  }): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO merchant_documents (merchant_id, document_type, document_url) VALUES (?, ?, ?)`,
      [data.merchant_id, data.document_type, data.document_url],
    );
    return result.meta.last_row_id as number;
  }

  async verify(id: number, verifiedBy: number): Promise<void> {
    await dbRun(
      this.db,
      `UPDATE merchant_documents
       SET is_verified = 1, verified_at = datetime('now', 'utc'), verified_by = ?
       WHERE id = ?`,
      [verifiedBy, id],
    );
  }
}

// ─── Merchant Bank Account Repository ─────────────────────────────────────────

export class MerchantBankAccountRepository {
  constructor(private readonly db: D1Database) {}

  async findByMerchantId(merchantId: number): Promise<MerchantBankAccount[]> {
    return dbQuery<MerchantBankAccount>(
      this.db,
      `SELECT * FROM merchant_bank_accounts WHERE merchant_id = ? ORDER BY is_primary DESC, created_at DESC`,
      [merchantId],
    );
  }

  async create(data: {
    merchant_id: number;
    bank_name: string;
    account_number: string;
    account_holder: string;
    is_primary: number;
  }): Promise<number> {
    // Jika is_primary=1, reset is_primary lain jadi 0
    if (data.is_primary === 1) {
      await dbRun(
        this.db,
        `UPDATE merchant_bank_accounts SET is_primary = 0 WHERE merchant_id = ?`,
        [data.merchant_id],
      );
    }
    const result = await dbRun(
      this.db,
      `INSERT INTO merchant_bank_accounts (merchant_id, bank_name, account_number, account_holder, is_primary)
       VALUES (?, ?, ?, ?, ?)`,
      [data.merchant_id, data.bank_name, data.account_number, data.account_holder, data.is_primary],
    );
    return result.meta.last_row_id as number;
  }

  async delete(id: number): Promise<void> {
    await dbRun(this.db, `DELETE FROM merchant_bank_accounts WHERE id = ?`, [id]);
  }
}

// ─── Merchant Branch Repository ───────────────────────────────────────────────

export class MerchantBranchRepository {
  constructor(private readonly db: D1Database) {}

  async findByMerchantId(merchantId: number): Promise<MerchantBranch[]> {
    return dbQuery<MerchantBranch>(
      this.db,
      `SELECT * FROM merchant_branches WHERE merchant_id = ? AND is_active = 1 ORDER BY is_main_branch DESC`,
      [merchantId],
    );
  }

  async findById(id: number): Promise<MerchantBranch | null> {
    return dbQueryFirst<MerchantBranch>(
      this.db,
      `SELECT * FROM merchant_branches WHERE id = ? LIMIT 1`,
      [id],
    );
  }

  async create(data: {
    merchant_id: number;
    branch_name: string;
    address: string;
    village_id?: number | null;
    hamlet_id?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    is_main_branch: number;
  }): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO merchant_branches
         (merchant_id, branch_name, address, village_id, hamlet_id, latitude, longitude, is_main_branch)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.merchant_id,
        data.branch_name,
        data.address,
        data.village_id ?? null,
        data.hamlet_id ?? null,
        data.latitude ?? null,
        data.longitude ?? null,
        data.is_main_branch,
      ],
    );
    return result.meta.last_row_id as number;
  }

  async upsertOperatingHours(
    branchId: number,
    hours: Array<{ day_of_week: number; open_time: string; close_time: string; is_open: number }>,
  ): Promise<void> {
    for (const h of hours) {
      await dbRun(
        this.db,
        `INSERT INTO merchant_operating_hours (branch_id, day_of_week, open_time, close_time, is_open)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (branch_id, day_of_week)
         DO UPDATE SET open_time = excluded.open_time, close_time = excluded.close_time, is_open = excluded.is_open`,
        [branchId, h.day_of_week, h.open_time, h.close_time, h.is_open],
      );
    }
  }

  async getOperatingHours(branchId: number): Promise<MerchantOperatingHours[]> {
    return dbQuery<MerchantOperatingHours>(
      this.db,
      `SELECT * FROM merchant_operating_hours WHERE branch_id = ? ORDER BY day_of_week ASC`,
      [branchId],
    );
  }
}
