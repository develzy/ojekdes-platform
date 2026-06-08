import { dbQuery, dbQueryFirst, dbRun } from '../lib/db';

// ─── DB Row Types ─────────────────────────────────────────────────────────────

export interface DbWallet {
  id: number;
  user_id: number;
  balance: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbWalletTransaction {
  id: number;
  wallet_id: number;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  reference_type: 'ORDER' | 'TOPUP' | 'WITHDRAWAL' | 'SYSTEM';
  reference_id: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class WalletRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Cari wallet berdasarkan user_id.
   */
  async findByUserId(userId: number): Promise<DbWallet | null> {
    return dbQueryFirst<DbWallet>(
      this.db,
      `SELECT * FROM wallets WHERE user_id = ? LIMIT 1`,
      [userId],
    );
  }

  /**
   * Buat wallet baru untuk user.
   */
  async create(userId: number, initialBalance = 0): Promise<number> {
    const result = await dbRun(
      this.db,
      `INSERT INTO wallets (user_id, balance) VALUES (?, ?)`,
      [userId, initialBalance],
    );
    return result.meta.last_row_id as number;
  }

  /**
   * Tambah saldo (CREDIT). Atomic dengan mencatat transaksi.
   */
  async credit(
    walletId: number,
    amount: number,
    referenceType: string,
    referenceId?: number | null,
    description?: string,
  ): Promise<void> {
    await Promise.all([
      dbRun(
        this.db,
        `UPDATE wallets
         SET balance = balance + ?, updated_at = datetime('now', 'utc')
         WHERE id = ?`,
        [amount, walletId],
      ),
      dbRun(
        this.db,
        `INSERT INTO wallet_transactions
           (wallet_id, amount, type, reference_type, reference_id, description)
         VALUES (?, ?, 'CREDIT', ?, ?, ?)`,
        [walletId, amount, referenceType, referenceId ?? null, description ?? null],
      ),
    ]);
  }

  /**
   * Kurangi saldo (DEBIT). Atomic dengan mencatat transaksi.
   * Melempar error jika saldo tidak mencukupi.
   */
  async debit(
    walletId: number,
    amount: number,
    referenceType: string,
    referenceId?: number | null,
    description?: string,
  ): Promise<void> {
    const wallet = await dbQueryFirst<DbWallet>(
      this.db,
      `SELECT * FROM wallets WHERE id = ? LIMIT 1`,
      [walletId],
    );

    if (!wallet || wallet.balance < amount) {
      throw new Error('Saldo tidak mencukupi');
    }

    await Promise.all([
      dbRun(
        this.db,
        `UPDATE wallets
         SET balance = balance - ?, updated_at = datetime('now', 'utc')
         WHERE id = ?`,
        [amount, walletId],
      ),
      dbRun(
        this.db,
        `INSERT INTO wallet_transactions
           (wallet_id, amount, type, reference_type, reference_id, description)
         VALUES (?, ?, 'DEBIT', ?, ?, ?)`,
        [walletId, amount, referenceType, referenceId ?? null, description ?? null],
      ),
    ]);
  }

  /**
   * Ambil riwayat transaksi wallet.
   */
  async getTransactions(
    walletId: number,
    page: number,
    limit: number,
  ): Promise<{ transactions: DbWalletTransaction[]; total: number }> {
    const offset = (page - 1) * limit;
    const [transactions, countResult] = await Promise.all([
      dbQuery<DbWalletTransaction>(
        this.db,
        `SELECT * FROM wallet_transactions
         WHERE wallet_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [walletId, limit, offset],
      ),
      dbQueryFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = ?`,
        [walletId],
      ),
    ]);
    return { transactions, total: countResult?.count ?? 0 };
  }
}
