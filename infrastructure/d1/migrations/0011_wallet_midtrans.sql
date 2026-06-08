PRAGMA foreign_keys = ON;

-- DEVELOPMENT ONLY
-- REMOVE BEFORE PRODUCTION
DROP TABLE IF EXISTS refund_transactions;
DROP TABLE IF EXISTS merchant_settlements;
DROP TABLE IF EXISTS settlements;
DROP TABLE IF EXISTS payout_requests;
DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS payment_transactions;
DROP TABLE IF EXISTS payments;

-- ─── 1. Wallets ──────────────────────────────────────────────────────────────
CREATE TABLE wallets (
  id           INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER  NOT NULL UNIQUE,
  balance      INTEGER  NOT NULL DEFAULT 0,
  hold_balance INTEGER  NOT NULL DEFAULT 0,
  created_at   DATETIME DEFAULT (datetime('now', 'utc')),
  updated_at   DATETIME DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- ─── 2. Wallet Transactions (Ledger) ──────────────────────────────────────────
CREATE TABLE wallet_transactions (
  id               INTEGER  PRIMARY KEY AUTOINCREMENT,
  wallet_id        INTEGER  NOT NULL,
  reference_type   TEXT     NOT NULL CHECK (reference_type IN ('ORDER', 'TOPUP', 'WITHDRAW', 'SETTLEMENT', 'BONUS', 'REFUND')),
  reference_id     INTEGER,
  transaction_type TEXT     NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
  amount           INTEGER  NOT NULL,
  balance_before   INTEGER  NOT NULL,
  balance_after    INTEGER  NOT NULL,
  description      TEXT,
  created_at       DATETIME DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT
);

CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);

-- ─── 3. Payment Transactions (Midtrans Snap / Core logs) ─────────────────────
CREATE TABLE payment_transactions (
  id                      INTEGER  PRIMARY KEY AUTOINCREMENT,
  order_id                INTEGER,
  merchant_order_id       INTEGER,
  payment_code            TEXT     NOT NULL UNIQUE,
  midtrans_transaction_id TEXT,
  payment_method          TEXT     NOT NULL CHECK (payment_method IN ('CASH', 'WALLET', 'QRIS', 'BANK_TRANSFER', 'GOPAY', 'SHOPEEPAY')),
  gross_amount            INTEGER  NOT NULL,
  fee_amount              INTEGER  NOT NULL DEFAULT 0,
  net_amount              INTEGER  NOT NULL,
  status                  TEXT     NOT NULL DEFAULT 'PENDING'
                                   CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED')),
  snap_token              TEXT,
  redirect_url            TEXT,
  paid_at                 DATETIME,
  created_at              DATETIME DEFAULT (datetime('now', 'utc')),
  updated_at              DATETIME DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (order_id)          REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (merchant_order_id) REFERENCES merchant_orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_payment_tx_code  ON payment_transactions(payment_code);
CREATE INDEX idx_payment_tx_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_tx_morder ON payment_transactions(merchant_order_id);

-- ─── 4. Settlements (Driver payout ledger) ──────────────────────────────────
CREATE TABLE settlements (
  id           INTEGER  PRIMARY KEY AUTOINCREMENT,
  driver_id    INTEGER  NOT NULL,
  order_id     INTEGER  NOT NULL UNIQUE,
  gross_amount INTEGER  NOT NULL,
  platform_fee INTEGER  NOT NULL,
  net_amount   INTEGER  NOT NULL,
  status       TEXT     NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SETTLED', 'FAILED')),
  settled_at   DATETIME,
  created_at   DATETIME DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id)  REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_settlements_driver ON settlements(driver_id);

-- ─── 5. Merchant Settlements ─────────────────────────────────────────────────
CREATE TABLE merchant_settlements (
  id                    INTEGER  PRIMARY KEY AUTOINCREMENT,
  merchant_id           INTEGER  NOT NULL,
  merchant_order_id     INTEGER  NOT NULL UNIQUE,
  gross_amount          INTEGER  NOT NULL,
  platform_fee          INTEGER  NOT NULL,
  net_amount            INTEGER  NOT NULL,
  status                TEXT     NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SETTLED', 'FAILED')),
  settled_at            DATETIME,
  created_at            DATETIME DEFAULT (datetime('now', 'utc')),
  created_by_payment_id INTEGER,
  FOREIGN KEY (merchant_id)       REFERENCES merchants(id) ON DELETE CASCADE,
  FOREIGN KEY (merchant_order_id) REFERENCES merchant_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_payment_id) REFERENCES payment_transactions(id) ON DELETE SET NULL
);

CREATE INDEX idx_msettlements_merch ON merchant_settlements(merchant_id);

-- ─── 6. Payout Requests (Wallet Withdrawals) ─────────────────────────────────
CREATE TABLE payout_requests (
  id              INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER  NOT NULL,
  wallet_id       INTEGER  NOT NULL,
  amount          INTEGER  NOT NULL,
  bank_account_id INTEGER  NOT NULL,
  status          TEXT     NOT NULL DEFAULT 'PENDING'
                           CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID')),
  requested_at    DATETIME DEFAULT (datetime('now', 'utc')),
  processed_at    DATETIME,
  processed_by    INTEGER,
  FOREIGN KEY (user_id)         REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id)        REFERENCES wallets(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES merchant_bank_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (processed_by)    REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_payout_requests_user ON payout_requests(user_id);
CREATE INDEX idx_payout_requests_status ON payout_requests(status);

-- ─── 7. Refund Transactions ──────────────────────────────────────────────────
CREATE TABLE refund_transactions (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  payment_id  INTEGER  NOT NULL,
  amount      INTEGER  NOT NULL,
  reason      TEXT,
  created_at  DATETIME DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (payment_id) REFERENCES payment_transactions(id) ON DELETE CASCADE
);

CREATE INDEX idx_refund_transactions_pay ON refund_transactions(payment_id);
