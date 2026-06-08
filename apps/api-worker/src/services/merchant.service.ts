import { MerchantRepository, MerchantDocumentRepository, MerchantBankAccountRepository } from '../repositories/merchant.repository';
import { MerchantCategoryRepository } from '../repositories/merchant-category.repository';
import { createAuditLog } from '../lib/audit';
import { AUDIT_ACTION, ENTITY_TYPE } from '../constants';
import type { CreateMerchantInput, UpdateMerchantInput, UpdateMerchantStatusInput, UploadDocumentInput, CreateBankAccountInput } from '../validators/merchant';

export class MerchantService {
  /**
   * Daftarkan merchant baru untuk user.
   * Setiap user hanya boleh memiliki 1 merchant aktif.
   */
  async createMerchant(
    data: CreateMerchantInput,
    userId: number,
    db: D1Database,
  ): Promise<{ merchant_id: number; merchant_code: string }> {
    const merchantRepo = new MerchantRepository(db);
    const categoryRepo = new MerchantCategoryRepository(db);

    // Cek apakah user sudah punya merchant
    const existing = await merchantRepo.findByUserId(userId);
    if (existing) {
      throw new Error('Anda sudah mendaftarkan merchant. Satu akun hanya bisa memiliki satu merchant.');
    }

    // Validasi kategori usaha
    const category = await categoryRepo.findById(data.category_id);
    if (!category || !category.is_active) {
      throw new Error('Kategori usaha tidak ditemukan atau tidak aktif');
    }

    const merchantId = await merchantRepo.create({
      user_id:       userId,
      category_id:   data.category_id,
      business_name: data.business_name,
      owner_name:    data.owner_name,
      phone:         data.phone,
      email:         data.email,
      description:   data.description,
      logo_url:      data.logo_url,
      banner_url:    data.banner_url,
    });

    const created = await merchantRepo.findById(merchantId);

    await createAuditLog(db, {
      user_id:     userId,
      action:      AUDIT_ACTION.CREATE,
      entity_type: ENTITY_TYPE.MERCHANT,
      entity_id:   merchantId,
      metadata:    { business_name: data.business_name },
    });

    return { merchant_id: merchantId, merchant_code: created!.merchant_code };
  }

  /**
   * Update data merchant. Hanya owner atau admin.
   */
  async updateMerchant(
    merchantId: number,
    data: UpdateMerchantInput,
    actorId: number,
    db: D1Database,
  ): Promise<void> {
    const merchantRepo = new MerchantRepository(db);
    const merchant = await merchantRepo.findById(merchantId);
    if (!merchant) throw new Error('Merchant tidak ditemukan');

    await merchantRepo.update(merchantId, data);

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.UPDATE,
      entity_type: ENTITY_TYPE.MERCHANT,
      entity_id:   merchantId,
      metadata:    { updated_fields: Object.keys(data) },
    });
  }

  /**
   * Approve merchant (Admin only).
   */
  async approveMerchant(merchantId: number, actorId: number, db: D1Database): Promise<void> {
    const merchantRepo = new MerchantRepository(db);
    const merchant = await merchantRepo.findById(merchantId);
    if (!merchant) throw new Error('Merchant tidak ditemukan');
    if (merchant.status === 'APPROVED') throw new Error('Merchant sudah aktif');

    await merchantRepo.updateStatus(merchantId, 'APPROVED', actorId);

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.APPROVE_MERCHANT,
      entity_type: ENTITY_TYPE.MERCHANT,
      entity_id:   merchantId,
      metadata:    { previous_status: merchant.status },
    });
  }

  /**
   * Reject merchant (Admin only).
   */
  async rejectMerchant(
    merchantId: number,
    reason: string | undefined | null,
    actorId: number,
    db: D1Database,
  ): Promise<void> {
    const merchantRepo = new MerchantRepository(db);
    const merchant = await merchantRepo.findById(merchantId);
    if (!merchant) throw new Error('Merchant tidak ditemukan');

    await merchantRepo.updateStatus(merchantId, 'REJECTED', actorId);

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.REJECT_MERCHANT,
      entity_type: ENTITY_TYPE.MERCHANT,
      entity_id:   merchantId,
      metadata:    { reason },
    });
  }

  /**
   * Suspend merchant (Admin only).
   */
  async suspendMerchant(
    merchantId: number,
    reason: string | undefined | null,
    actorId: number,
    db: D1Database,
  ): Promise<void> {
    const merchantRepo = new MerchantRepository(db);
    const merchant = await merchantRepo.findById(merchantId);
    if (!merchant) throw new Error('Merchant tidak ditemukan');
    if (merchant.status === 'SUSPENDED') throw new Error('Merchant sudah disuspend');

    await merchantRepo.updateStatus(merchantId, 'SUSPENDED', actorId);

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.SUSPEND_MERCHANT,
      entity_type: ENTITY_TYPE.MERCHANT,
      entity_id:   merchantId,
      metadata:    { reason },
    });
  }

  /**
   * Ambil detail merchant berdasarkan ID.
   */
  async getMerchantById(id: number, db: D1Database) {
    const merchantRepo = new MerchantRepository(db);
    const merchant = await merchantRepo.findById(id);
    if (!merchant) throw new Error('Merchant tidak ditemukan');
    return merchant;
  }

  /**
   * Ambil merchant milik user sendiri.
   */
  async getMyMerchant(userId: number, db: D1Database) {
    const merchantRepo = new MerchantRepository(db);
    const merchant = await merchantRepo.findByUserId(userId);
    if (!merchant) throw new Error('Anda belum mendaftarkan merchant');
    return merchant;
  }

  /**
   * List merchant dengan pagination dan filter.
   */
  async listMerchants(
    page: number,
    limit: number,
    db: D1Database,
    status?: string,
    categoryId?: number,
    search?: string,
  ) {
    const merchantRepo = new MerchantRepository(db);
    return merchantRepo.list(page, limit, status, categoryId, search);
  }

  /**
   * Soft delete merchant (Admin only).
   */
  async deleteMerchant(merchantId: number, actorId: number, db: D1Database): Promise<void> {
    const merchantRepo = new MerchantRepository(db);
    const merchant = await merchantRepo.findById(merchantId);
    if (!merchant) throw new Error('Merchant tidak ditemukan');

    await merchantRepo.softDelete(merchantId);

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.DELETE,
      entity_type: ENTITY_TYPE.MERCHANT,
      entity_id:   merchantId,
    });
  }

  // ─── Documents ──────────────────────────────────────────────────────────────

  async uploadDocument(
    merchantId: number,
    data: UploadDocumentInput,
    actorId: number,
    db: D1Database,
  ): Promise<{ document_id: number }> {
    const docRepo = new MerchantDocumentRepository(db);
    const documentId = await docRepo.create({
      merchant_id:   merchantId,
      document_type: data.document_type,
      document_url:  data.document_url,
    });

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.CREATE,
      entity_type: ENTITY_TYPE.MERCHANT_DOCUMENT,
      entity_id:   documentId,
      metadata:    { merchant_id: merchantId, document_type: data.document_type },
    });

    return { document_id: documentId };
  }

  async listDocuments(merchantId: number, db: D1Database) {
    const docRepo = new MerchantDocumentRepository(db);
    return docRepo.findByMerchantId(merchantId);
  }

  async verifyDocument(docId: number, actorId: number, db: D1Database): Promise<void> {
    const docRepo = new MerchantDocumentRepository(db);
    const doc = await docRepo.findById(docId);
    if (!doc) throw new Error('Dokumen tidak ditemukan');

    await docRepo.verify(docId, actorId);

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.VERIFY_DOCUMENT,
      entity_type: ENTITY_TYPE.MERCHANT_DOCUMENT,
      entity_id:   docId,
      metadata:    { merchant_id: doc.merchant_id, document_type: doc.document_type },
    });
  }

  // ─── Bank Accounts ──────────────────────────────────────────────────────────

  async addBankAccount(
    merchantId: number,
    data: CreateBankAccountInput,
    actorId: number,
    db: D1Database,
  ): Promise<{ account_id: number }> {
    const bankRepo = new MerchantBankAccountRepository(db);
    const accountId = await bankRepo.create({
      merchant_id:    merchantId,
      bank_name:      data.bank_name,
      account_number: data.account_number,
      account_holder: data.account_holder,
      is_primary:     data.is_primary,
    });

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.CREATE,
      entity_type: ENTITY_TYPE.MERCHANT,
      entity_id:   merchantId,
      metadata:    { sub_action: 'add_bank_account', bank_name: data.bank_name },
    });

    return { account_id: accountId };
  }

  async listBankAccounts(merchantId: number, db: D1Database) {
    const bankRepo = new MerchantBankAccountRepository(db);
    return bankRepo.findByMerchantId(merchantId);
  }

  async deleteBankAccount(accountId: number, actorId: number, db: D1Database): Promise<void> {
    const bankRepo = new MerchantBankAccountRepository(db);
    await bankRepo.delete(accountId);

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.DELETE,
      entity_type: ENTITY_TYPE.MERCHANT,
      entity_id:   accountId,
      metadata:    { sub_action: 'delete_bank_account' },
    });
  }
}
