-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 0009_order_engine
-- Phase 2B: Order Engine
-- Tables: orders, order_tracking, order_status_history,
--         driver_assignments, order_cancellations, order_ratings, order_proofs
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Orders (main table, replaces old orders schema) ───────────────────────
-- NOTE: Tabel lama `orders` dari Phase 1 memiliki schema yang berbeda.
-- Migration ini DROP & RECREATE dengan schema baru yang lengkap.
-- Jika ada data lama, pastikan sudah di-backup.

DROP TABLE IF EXISTS order_status_logs;   -- lama, diganti order_status_history
DROP TABLE IF EXISTS order_locations;     -- lama, field dipindah inline ke orders

-- Drop tabel orders lama jika ada (Phase 1 placeholder)
DROP TABLE IF EXISTS orders;

CREATE TABLE orders (
  id                     INTEGER  PRIMARY KEY AUTOINCREMENT,
  order_number           TEXT     NOT NULL UNIQUE,

  -- Actors
  customer_id            INTEGER  NOT NULL,
  driver_id              INTEGER,
  merchant_id            INTEGER,
  merchant_order_id      INTEGER,

  -- Service
  service_type           TEXT     NOT NULL
                                  CHECK (service_type IN ('RIDE','COURIER','MERCHANT')),

  -- Pickup
  pickup_name            TEXT,
  pickup_phone           TEXT,
  pickup_address         TEXT     NOT NULL,
  pickup_latitude        REAL     NOT NULL,
  pickup_longitude       REAL     NOT NULL,

  -- Destination
  destination_name       TEXT,
  destination_phone      TEXT,
  destination_address    TEXT     NOT NULL,
  destination_latitude   REAL     NOT NULL,
  destination_longitude  REAL     NOT NULL,

  -- Trip data
  distance_km            REAL     NOT NULL DEFAULT 0,
  duration_minutes       INTEGER  NOT NULL DEFAULT 0,

  -- Pricing
  estimated_price        INTEGER  NOT NULL DEFAULT 0,
  final_price            INTEGER  NOT NULL DEFAULT 0,

  -- Payment
  payment_method         TEXT     NOT NULL DEFAULT 'CASH'
                                  CHECK (payment_method IN ('CASH','WALLET','MIDTRANS')),
  payment_status         TEXT     NOT NULL DEFAULT 'PENDING'
                                  CHECK (payment_status IN ('PENDING','PAID','FAILED','REFUNDED')),

  -- Status
  status                 TEXT     NOT NULL DEFAULT 'SEARCHING_DRIVER'
                                  CHECK (status IN (
                                    'SEARCHING_DRIVER','DRIVER_ASSIGNED','DRIVER_ARRIVED',
                                    'ON_TRIP','DELIVERED','COMPLETED','CANCELLED'
                                  )),

  notes                  TEXT,
  created_at             DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at             DATETIME NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE INDEX IF NOT EXISTS idx_orders_number       ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id  ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id    ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id  ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_service_type ON orders(service_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at   ON orders(created_at);

-- ─── 2. Order Tracking ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_tracking (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER  NOT NULL,
  driver_id   INTEGER  NOT NULL,
  latitude    REAL     NOT NULL,
  longitude   REAL     NOT NULL,
  accuracy    REAL,
  recorded_at DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (order_id)  REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

CREATE INDEX IF NOT EXISTS idx_tracking_order_id  ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_driver_id ON order_tracking(driver_id);
CREATE INDEX IF NOT EXISTS idx_tracking_recorded  ON order_tracking(recorded_at);

-- ─── 3. Order Status History ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_status_history (
  id         INTEGER  PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER  NOT NULL,
  old_status TEXT,
  new_status TEXT     NOT NULL,
  changed_by INTEGER,
  notes      TEXT,
  created_at DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_status_history_order_id ON order_status_history(order_id);

-- ─── 4. Driver Assignments ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_assignments (
  id                INTEGER  PRIMARY KEY AUTOINCREMENT,
  order_id          INTEGER  NOT NULL,
  driver_id         INTEGER  NOT NULL,
  assignment_status TEXT     NOT NULL DEFAULT 'PENDING'
                             CHECK (assignment_status IN ('PENDING','ACCEPTED','REJECTED','EXPIRED')),
  assigned_at       DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  responded_at      DATETIME,
  FOREIGN KEY (order_id)  REFERENCES orders(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_order_id  ON driver_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_assignments_driver_id ON driver_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status    ON driver_assignments(assignment_status);

-- ─── 5. Order Cancellations ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_cancellations (
  id            INTEGER  PRIMARY KEY AUTOINCREMENT,
  order_id      INTEGER  NOT NULL UNIQUE,
  cancelled_by  INTEGER  NOT NULL,
  reason        TEXT     NOT NULL,
  refund_amount INTEGER  NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (order_id)     REFERENCES orders(id),
  FOREIGN KEY (cancelled_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_cancellations_order_id ON order_cancellations(order_id);

-- ─── 6. Order Ratings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_ratings (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER  NOT NULL UNIQUE,
  customer_id INTEGER  NOT NULL,
  driver_id   INTEGER  NOT NULL,
  rating      INTEGER  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review      TEXT,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (order_id)    REFERENCES orders(id),
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (driver_id)   REFERENCES drivers(id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_order_id    ON order_ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_ratings_driver_id   ON order_ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_ratings_customer_id ON order_ratings(customer_id);

-- ─── 7. Order Proofs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_proofs (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER  NOT NULL,
  proof_type  TEXT     NOT NULL CHECK (proof_type IN ('PICKUP','DELIVERY')),
  image_url   TEXT     NOT NULL,
  uploaded_by INTEGER  NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (order_id)    REFERENCES orders(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_proofs_order_id ON order_proofs(order_id);
