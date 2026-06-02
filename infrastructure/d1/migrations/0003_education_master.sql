-- Enforce Foreign Key Constraints
PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. SCHOOLS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_code TEXT NOT NULL UNIQUE,
    school_name TEXT NOT NULL,
    education_level TEXT NOT NULL CHECK (education_level IN ('TK', 'SD', 'SMP', 'SMA', 'SMK', 'MA', 'PT')),
    address TEXT NOT NULL,
    village_id INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    school_start_time TEXT NOT NULL, -- Format HH:MM
    school_end_time TEXT NOT NULL,   -- Format HH:MM
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE RESTRICT
);

-- ==========================================
-- 2. BOARDING SCHOOLS (PONDOK PESANTREN) TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS boarding_schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boarding_school_code TEXT NOT NULL UNIQUE,
    boarding_school_name TEXT NOT NULL,
    leader_name TEXT,
    address TEXT NOT NULL,
    village_id INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE RESTRICT
);

-- ==========================================
-- 3. POINTS OF INTEREST (POIs) TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS points_of_interest (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poi_code TEXT NOT NULL UNIQUE,
    poi_name TEXT NOT NULL,
    poi_type TEXT NOT NULL CHECK (poi_type IN ('PASAR', 'MASJID', 'MUSHOLA', 'BALAI_DESA', 'PUSKESMAS', 'KLINIK', 'SEKOLAH', 'PONDOK', 'TERMINAL', 'KANTOR_DESA', 'KANTOR_KECAMATAN', 'SPBU', 'MINIMARKET')),
    address TEXT NOT NULL,
    village_id INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    deleted_at TEXT,
    FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE RESTRICT
);
