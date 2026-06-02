-- Enforce Foreign Key Constraints
PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. DRIVERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    license_number TEXT NOT NULL,
    rating REAL NOT NULL DEFAULT 5.0,
    status TEXT NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('OFFLINE', 'ONLINE', 'BUSY', 'SUSPENDED')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==========================================
-- 2. VEHICLES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id INTEGER NOT NULL UNIQUE,
    plate_number TEXT NOT NULL UNIQUE,
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('MOTOR', 'BENTOR')),
    brand_model TEXT NOT NULL,
    photo_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

-- ==========================================
-- 3. DRIVER DOCUMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS driver_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id INTEGER NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('KTP', 'SIM', 'STNK', 'SKCK')),
    document_url TEXT NOT NULL,
    verified_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verified_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    verified_at TEXT,
    verified_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ==========================================
-- 4. DRIVER STATUS LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS driver_status_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id INTEGER NOT NULL,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);
