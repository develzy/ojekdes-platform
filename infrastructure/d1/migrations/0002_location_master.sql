-- Enforce Foreign Key Constraints
PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. PROVINCES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS provinces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province_code TEXT NOT NULL UNIQUE,
    province_name TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT
);

-- ==========================================
-- 2. REGENCIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS regencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province_id INTEGER NOT NULL,
    regency_code TEXT NOT NULL UNIQUE,
    regency_name TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE RESTRICT
);

-- ==========================================
-- 3. DISTRICTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS districts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    regency_id INTEGER NOT NULL,
    district_code TEXT NOT NULL UNIQUE,
    district_name TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (regency_id) REFERENCES regencies(id) ON DELETE RESTRICT
);

-- ==========================================
-- 4. VILLAGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS villages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    district_id INTEGER NOT NULL,
    village_code TEXT NOT NULL UNIQUE,
    village_name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    is_active_service_area INTEGER NOT NULL DEFAULT 0 CHECK (is_active_service_area IN (0, 1)),
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE RESTRICT
);

-- ==========================================
-- 5. HAMLETS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS hamlets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    village_id INTEGER NOT NULL,
    hamlet_code TEXT NOT NULL UNIQUE,
    hamlet_name TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE CASCADE
);

-- ==========================================
-- 6. ZONES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_code TEXT NOT NULL UNIQUE,
    zone_name TEXT NOT NULL,
    zone_type TEXT NOT NULL CHECK (zone_type IN ('CORE', 'RURAL', 'REMOTE')),
    description TEXT,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT
);

-- ==========================================
-- 7. SERVICE AREAS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS service_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    village_id INTEGER NOT NULL UNIQUE,
    zone_id INTEGER,
    coverage_type TEXT NOT NULL CHECK (coverage_type IN ('full', 'pickup_only', 'dropoff_only', 'none')),
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE CASCADE,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
);

-- ==========================================
-- 8. ROADS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS roads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    road_name TEXT NOT NULL,
    village_id INTEGER NOT NULL,
    road_type TEXT NOT NULL CHECK (road_type IN ('asphalt', 'concrete', 'gravel', 'dirt')),
    road_condition TEXT NOT NULL CHECK (road_condition IN ('good', 'fair', 'damaged', 'severe')),
    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('normal', 'uphill', 'steep', 'extreme')),
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE CASCADE
);
