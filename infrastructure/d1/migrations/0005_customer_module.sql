-- Enforce Foreign Key Constraints
PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. CUSTOMERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    student_card_url TEXT,
    is_verified_student INTEGER NOT NULL DEFAULT 0 CHECK (is_verified_student IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==========================================
-- 2. CUSTOMER ADDRESSES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS customer_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    address_label TEXT NOT NULL, -- e.g. Rumah, Sekolah
    address_text TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    village_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE RESTRICT
);

-- ==========================================
-- 3. CUSTOMER FAVORITES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS customer_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
