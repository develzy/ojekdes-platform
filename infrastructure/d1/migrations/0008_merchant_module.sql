-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 0008_merchant_module
-- Phase 2A: Merchant Module
-- Tables: merchant_categories, merchant_product_categories, merchants,
--         merchant_documents, merchant_bank_accounts, merchant_branches,
--         merchant_operating_hours, merchant_products, merchant_product_images,
--         merchant_orders, merchant_order_items
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Merchant Business Categories ─────────────────────────────────────────
-- Kategori USAHA: FOOD, GROCERY, FARM, FISHERY, HANDICRAFT, SERVICES
CREATE TABLE IF NOT EXISTS merchant_categories (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  code        TEXT     NOT NULL UNIQUE,
  name        TEXT     NOT NULL,
  description TEXT,
  icon        TEXT,
  is_active   INTEGER  NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE INDEX IF NOT EXISTS idx_merchant_categories_code     ON merchant_categories(code);
CREATE INDEX IF NOT EXISTS idx_merchant_categories_active   ON merchant_categories(is_active);

-- Seed kategori usaha default
INSERT OR IGNORE INTO merchant_categories (code, name, description, icon) VALUES
  ('FOOD',       'Makanan & Minuman',  'Warung makan, kedai, rumah makan, katering', '🍽️'),
  ('GROCERY',    'Sembako & Kelontong','Toko kelontong, minimarket desa, sembako',    '🛒'),
  ('FARM',       'Pertanian',          'Produk pertanian, sayuran, buah, hasil kebun','🌾'),
  ('FISHERY',    'Perikanan',          'Ikan segar, olahan ikan, hasil laut',          '🐟'),
  ('HANDICRAFT', 'Kerajinan Tangan',   'Produk kerajinan, oleh-oleh, suvenir desa',   '🎨'),
  ('SERVICES',   'Jasa & Layanan',     'Jasa potong rambut, laundry, reparasi, dll',  '🔧');

-- ─── 2. Merchant Product Categories ──────────────────────────────────────────
-- Kategori PRODUK: Makanan Berat, Minuman, Snack, Sayuran, Buah, Sembako, ...
CREATE TABLE IF NOT EXISTS merchant_product_categories (
  id                   INTEGER  PRIMARY KEY AUTOINCREMENT,
  merchant_category_id INTEGER,                  -- optional parent business category
  code                 TEXT     NOT NULL UNIQUE,
  name                 TEXT     NOT NULL,
  icon                 TEXT,
  is_active            INTEGER  NOT NULL DEFAULT 1,
  created_at           DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at           DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (merchant_category_id) REFERENCES merchant_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_mpc_business_category ON merchant_product_categories(merchant_category_id);
CREATE INDEX IF NOT EXISTS idx_mpc_code              ON merchant_product_categories(code);

-- Seed kategori produk default
INSERT OR IGNORE INTO merchant_product_categories (merchant_category_id, code, name, icon) VALUES
  -- FOOD (id=1)
  (1, 'FOOD_HEAVY',    'Makanan Berat',   '🍛'),
  (1, 'FOOD_SNACK',    'Snack & Camilan', '🍟'),
  (1, 'FOOD_DRINK',    'Minuman',         '🥤'),
  (1, 'FOOD_DESSERT',  'Kue & Dessert',   '🍰'),
  -- GROCERY (id=2)
  (2, 'GROC_STAPLE',   'Sembako',         '🛒'),
  (2, 'GROC_SPICE',    'Bumbu Dapur',     '🌶️'),
  (2, 'GROC_HYGIENE',  'Kebersihan',      '🧴'),
  -- FARM (id=3)
  (3, 'FARM_VEG',      'Sayuran',         '🥬'),
  (3, 'FARM_FRUIT',    'Buah-buahan',     '🍎'),
  (3, 'FARM_GRAIN',    'Biji-bijian',     '🌽'),
  -- FISHERY (id=4)
  (4, 'FISH_FRESH',    'Ikan Segar',      '🐟'),
  (4, 'FISH_PROCESSED','Olahan Ikan',     '🦐'),
  -- HANDICRAFT (id=5)
  (5, 'CRAFT_WEAVE',   'Anyaman & Tenun', '🧶'),
  (5, 'CRAFT_SOUVENIR','Suvenir Desa',    '🎁'),
  -- SERVICES (id=6)
  (6, 'SVC_LAUNDRY',   'Laundry',         '👕'),
  (6, 'SVC_REPAIR',    'Reparasi',        '🔧'),
  -- Cross-category
  (NULL, 'OTHER',      'Lainnya',         '📦');

-- ─── 3. Merchants ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchants (
  id             INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER  NOT NULL,
  category_id    INTEGER  NOT NULL,
  merchant_code  TEXT     NOT NULL UNIQUE,
  business_name  TEXT     NOT NULL,
  owner_name     TEXT     NOT NULL,
  phone          TEXT     NOT NULL,
  email          TEXT,
  description    TEXT,
  logo_url       TEXT,
  banner_url     TEXT,
  status         TEXT     NOT NULL DEFAULT 'PENDING'
                          CHECK (status IN ('PENDING','APPROVED','REJECTED','SUSPENDED')),
  verified_at    DATETIME,
  verified_by    INTEGER,
  created_at     DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at     DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  deleted_at     DATETIME,
  FOREIGN KEY (user_id)     REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES merchant_categories(id),
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_merchants_user_id     ON merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_code        ON merchants(merchant_code);
CREATE INDEX IF NOT EXISTS idx_merchants_status      ON merchants(status);
CREATE INDEX IF NOT EXISTS idx_merchants_category_id ON merchants(category_id);
CREATE INDEX IF NOT EXISTS idx_merchants_deleted_at  ON merchants(deleted_at);

-- ─── 4. Merchant Documents ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_documents (
  id            INTEGER  PRIMARY KEY AUTOINCREMENT,
  merchant_id   INTEGER  NOT NULL,
  document_type TEXT     NOT NULL
                         CHECK (document_type IN ('KTP','NPWP','NIB','SIUP','FOTO_TOKO')),
  document_url  TEXT     NOT NULL,
  is_verified   INTEGER  NOT NULL DEFAULT 0,
  verified_at   DATETIME,
  verified_by   INTEGER,
  created_at    DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (merchant_id)  REFERENCES merchants(id),
  FOREIGN KEY (verified_by)  REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_merchant_docs_merchant_id ON merchant_documents(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_docs_type        ON merchant_documents(document_type);

-- ─── 5. Merchant Bank Accounts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_bank_accounts (
  id             INTEGER  PRIMARY KEY AUTOINCREMENT,
  merchant_id    INTEGER  NOT NULL,
  bank_name      TEXT     NOT NULL,
  account_number TEXT     NOT NULL,
  account_holder TEXT     NOT NULL,
  is_primary     INTEGER  NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE INDEX IF NOT EXISTS idx_merchant_bank_merchant_id ON merchant_bank_accounts(merchant_id);

-- ─── 6. Merchant Branches ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_branches (
  id             INTEGER  PRIMARY KEY AUTOINCREMENT,
  merchant_id    INTEGER  NOT NULL,
  village_id     INTEGER,
  hamlet_id      INTEGER,
  branch_name    TEXT     NOT NULL,
  address        TEXT     NOT NULL,
  latitude       REAL,
  longitude      REAL,
  is_main_branch INTEGER  NOT NULL DEFAULT 0,
  is_active      INTEGER  NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at     DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  FOREIGN KEY (village_id)  REFERENCES villages(id),
  FOREIGN KEY (hamlet_id)   REFERENCES hamlets(id)
);

CREATE INDEX IF NOT EXISTS idx_branches_merchant_id  ON merchant_branches(merchant_id);
CREATE INDEX IF NOT EXISTS idx_branches_village_id   ON merchant_branches(village_id);
CREATE INDEX IF NOT EXISTS idx_branches_active       ON merchant_branches(is_active);

-- ─── 7. Merchant Operating Hours ─────────────────────────────────────────────
-- day_of_week: 0=Minggu, 1=Senin, ..., 6=Sabtu
CREATE TABLE IF NOT EXISTS merchant_operating_hours (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id   INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time   TEXT    NOT NULL,   -- format HH:MM
  close_time  TEXT    NOT NULL,   -- format HH:MM
  is_open     INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (branch_id) REFERENCES merchant_branches(id),
  UNIQUE (branch_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_op_hours_branch_id ON merchant_operating_hours(branch_id);

-- ─── 8. Merchant Products ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_products (
  id           INTEGER  PRIMARY KEY AUTOINCREMENT,
  merchant_id  INTEGER  NOT NULL,
  category_id  INTEGER  NOT NULL,   -- → merchant_product_categories
  sku          TEXT     NOT NULL,
  name         TEXT     NOT NULL,
  slug         TEXT     NOT NULL,
  description  TEXT,
  image_url    TEXT,
  price        INTEGER  NOT NULL DEFAULT 0,   -- in IDR (integer, no decimal)
  stock        INTEGER  NOT NULL DEFAULT 0,
  weight       INTEGER  NOT NULL DEFAULT 0,   -- in grams
  is_available INTEGER  NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at   DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  deleted_at   DATETIME,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  FOREIGN KEY (category_id) REFERENCES merchant_product_categories(id),
  UNIQUE (merchant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_merchant_id  ON merchant_products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id  ON merchant_products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug         ON merchant_products(slug);
CREATE INDEX IF NOT EXISTS idx_products_available    ON merchant_products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at   ON merchant_products(deleted_at);

-- ─── 9. Merchant Product Images ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  image_url  TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES merchant_products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON merchant_product_images(product_id);

-- ─── 10. Merchant Orders ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_orders (
  id            INTEGER  PRIMARY KEY AUTOINCREMENT,
  order_number  TEXT     NOT NULL UNIQUE,
  customer_id   INTEGER  NOT NULL,
  merchant_id   INTEGER  NOT NULL,
  branch_id     INTEGER,
  driver_id     INTEGER,
  subtotal      INTEGER  NOT NULL DEFAULT 0,
  delivery_fee  INTEGER  NOT NULL DEFAULT 0,
  total_amount  INTEGER  NOT NULL DEFAULT 0,
  status        TEXT     NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN (
                           'PENDING','CONFIRMED','PREPARING',
                           'READY_FOR_PICKUP','PICKED_UP','DELIVERED','CANCELLED'
                         )),
  notes         TEXT,
  created_at    DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at    DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  FOREIGN KEY (branch_id)   REFERENCES merchant_branches(id),
  FOREIGN KEY (driver_id)   REFERENCES drivers(id)
);

CREATE INDEX IF NOT EXISTS idx_merchant_orders_number      ON merchant_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_merchant_orders_customer_id ON merchant_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_merchant_orders_merchant_id ON merchant_orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_orders_driver_id   ON merchant_orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_merchant_orders_status      ON merchant_orders(status);
CREATE INDEX IF NOT EXISTS idx_merchant_orders_created_at  ON merchant_orders(created_at);

-- ─── 11. Merchant Order Items ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_order_items (
  id               INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  merchant_order_id INTEGER NOT NULL,
  product_id       INTEGER NOT NULL,
  quantity         INTEGER NOT NULL DEFAULT 1,
  unit_price       INTEGER NOT NULL DEFAULT 0,
  total_price      INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (merchant_order_id) REFERENCES merchant_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)        REFERENCES merchant_products(id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON merchant_order_items(merchant_order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON merchant_order_items(product_id);
