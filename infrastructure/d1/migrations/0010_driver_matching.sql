-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 0010_driver_matching
-- Phase 2C: Driver Matching Engine
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Driver Sessions (Real-time online status and last coordinates) ───────
CREATE TABLE IF NOT EXISTS driver_sessions (
  id                INTEGER  PRIMARY KEY AUTOINCREMENT,
  driver_id         INTEGER  NOT NULL UNIQUE,
  is_online         INTEGER  NOT NULL DEFAULT 0 CHECK (is_online IN (0, 1)),
  current_latitude  REAL,
  current_longitude REAL,
  last_seen_at      DATETIME DEFAULT (datetime('now', 'utc')),
  created_at        DATETIME DEFAULT (datetime('now', 'utc')),
  updated_at        DATETIME DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_driver_sessions_coords ON driver_sessions(current_latitude, current_longitude);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_online ON driver_sessions(is_online);

-- ─── 2. Driver Locations (Audit trail / location history logs) ───────────────
CREATE TABLE IF NOT EXISTS driver_locations (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  driver_id   INTEGER  NOT NULL,
  latitude    REAL     NOT NULL,
  longitude   REAL     NOT NULL,
  accuracy    REAL,
  recorded_at DATETIME DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_time   ON driver_locations(recorded_at);

-- ─── 3. Driver Matching Queue (Broadcast targets per order) ──────────────────
CREATE TABLE IF NOT EXISTS driver_matching_queue (
  id           INTEGER  PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER  NOT NULL,
  driver_id    INTEGER  NOT NULL,
  priority     INTEGER  NOT NULL DEFAULT 1,
  distance_km  REAL     NOT NULL,
  status       TEXT     NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
  sent_at      DATETIME,
  responded_at DATETIME,
  FOREIGN KEY (order_id)  REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_matching_queue_order  ON driver_matching_queue(order_id);
CREATE INDEX IF NOT EXISTS idx_matching_queue_driver ON driver_matching_queue(driver_id);
CREATE INDEX IF NOT EXISTS idx_matching_queue_status ON driver_matching_queue(status);

-- ─── 4. Driver Assignment History (Historical audit log of actions) ──────────
CREATE TABLE IF NOT EXISTS driver_assignment_history (
  id         INTEGER  PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER  NOT NULL,
  driver_id  INTEGER  NOT NULL,
  action     TEXT     NOT NULL CHECK (action IN ('BROADCAST', 'ACCEPT', 'REJECT', 'TIMEOUT', 'AUTO_ASSIGN')),
  created_at DATETIME DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (order_id)  REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assignment_history_order ON driver_assignment_history(order_id);

-- ─── 5. Driver Availability (Tracks active orders/busy state) ────────────────
CREATE TABLE IF NOT EXISTS driver_availability (
  id               INTEGER  PRIMARY KEY AUTOINCREMENT,
  driver_id        INTEGER  NOT NULL UNIQUE,
  is_available     INTEGER  NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  current_order_id INTEGER,
  updated_at       DATETIME DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (driver_id)        REFERENCES drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (current_order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_driver_avail ON driver_availability(is_available);
