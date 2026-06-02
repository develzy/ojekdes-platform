-- Enforce Foreign Key Constraints
PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. TARIFFS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS tariffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_type TEXT NOT NULL UNIQUE CHECK (service_type IN ('MOTOR', 'BENTOR', 'PELAJAR')),
    base_distance REAL NOT NULL,
    base_price INTEGER NOT NULL,
    additional_price_per_km INTEGER NOT NULL,
    active_status INTEGER NOT NULL DEFAULT 1 CHECK (active_status IN (0, 1)),
    effective_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT
);

-- ==========================================
-- 2. TARIFF ADJUSTMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS tariff_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adjustment_name TEXT NOT NULL,
    adjustment_type TEXT NOT NULL UNIQUE CHECK (adjustment_type IN ('student_discount', 'damaged_road', 'uphill_road', 'remote_area', 'night_fee', 'weather_fee')),
    adjustment_mode TEXT NOT NULL CHECK (adjustment_mode IN ('percentage', 'flat')),
    adjustment_value REAL NOT NULL,
    active_status INTEGER NOT NULL DEFAULT 1 CHECK (active_status IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT
);

-- ==========================================
-- 3. ORDERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL,
    driver_id INTEGER,
    service_type TEXT NOT NULL CHECK (service_type IN ('MOTOR', 'BENTOR', 'PELAJAR')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SEARCHING_DRIVER', 'DRIVER_ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    distance REAL NOT NULL,
    fare INTEGER NOT NULL,
    platform_fee INTEGER NOT NULL,
    net_fare INTEGER NOT NULL,
    discount INTEGER NOT NULL DEFAULT 0,
    surcharge INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'QRIS')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
);

-- ==========================================
-- 4. ORDER LOCATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS order_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL UNIQUE,
    pickup_address TEXT NOT NULL,
    pickup_latitude REAL NOT NULL,
    pickup_longitude REAL NOT NULL,
    pickup_village_id INTEGER NOT NULL,
    dropoff_address TEXT NOT NULL,
    dropoff_latitude REAL NOT NULL,
    dropoff_longitude REAL NOT NULL,
    dropoff_village_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (pickup_village_id) REFERENCES villages(id) ON DELETE RESTRICT,
    FOREIGN KEY (dropoff_village_id) REFERENCES villages(id) ON DELETE RESTRICT
);

-- ==========================================
-- 5. ORDER STATUS LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS order_status_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ==========================================
-- 6. ORDER CANCELLATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS order_cancellations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL UNIQUE,
    cancelled_by INTEGER NOT NULL,
    reason_category TEXT NOT NULL CHECK (reason_category IN ('driver_not_moving', 'client_cancelled', 'change_mind', 'wait_too_long', 'other')),
    reason_text TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE RESTRICT
);
