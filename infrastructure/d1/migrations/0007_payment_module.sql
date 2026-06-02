-- Enforce Foreign Key Constraints
PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. PAYMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL UNIQUE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'QRIS')),
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'EXPIRED')),
    midtrans_payment_type TEXT,
    midtrans_transaction_id TEXT UNIQUE,
    midtrans_order_id TEXT UNIQUE,
    paid_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT
);

-- ==========================================
-- 2. PAYMENT TRANSACTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'payout', 'refund')),
    amount INTEGER NOT NULL,
    raw_payload TEXT, -- JSON string payload
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

-- ==========================================
-- 3. WALLETS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    balance INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==========================================
-- 4. WALLET TRANSACTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
    reference_type TEXT NOT NULL CHECK (reference_type IN ('ORDER', 'TOPUP', 'WITHDRAWAL', 'SYSTEM')),
    reference_id INTEGER,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT
);
