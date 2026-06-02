-- Enforce Foreign Keys
PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. SEED DEV USERS (Password: password123)
-- BCrypt Hash: $2a$10$wK5h6F0L4o3/Kj6eB2x/Nu6w07dE3/h9bK87.6b7C7v9aE8uLhP2e
-- ==========================================
INSERT INTO users (id, phone, email, password_hash, role, is_active) VALUES
(1, '081234567890', 'admin@ojekdes.com', '$2a$10$wK5h6F0L4o3/Kj6eB2x/Nu6w07dE3/h9bK87.6b7C7v9aE8uLhP2e', 'admin', 1),
(2, '081234567891', 'driver@ojekdes.com', '$2a$10$wK5h6F0L4o3/Kj6eB2x/Nu6w07dE3/h9bK87.6b7C7v9aE8uLhP2e', 'driver', 1),
(3, '081234567892', 'customer@ojekdes.com', '$2a$10$wK5h6F0L4o3/Kj6eB2x/Nu6w07dE3/h9bK87.6b7C7v9aE8uLhP2e', 'customer', 1);

-- ==========================================
-- 2. SEED DEV USER PROFILES
-- ==========================================
INSERT INTO user_profiles (user_id, full_name, avatar_url) VALUES
(1, 'M. Lu Lu Khulaluddin (Admin)', 'https://res.cloudinary.com/ojekdes/image/upload/v12345/admin_avatar.png'),
(2, 'Pak Budi (Driver)', 'https://res.cloudinary.com/ojekdes/image/upload/v12345/driver_avatar.png'),
(3, 'Agus Santoso (Customer)', 'https://res.cloudinary.com/ojekdes/image/upload/v12345/customer_avatar.png');

-- ==========================================
-- 3. SEED DRIVER & VEHICLE
-- ==========================================
INSERT INTO drivers (id, user_id, license_number, rating, status) VALUES
(1, 2, 'SIM-998877-A', 4.9, 'ONLINE');

INSERT INTO vehicles (id, driver_id, plate_number, vehicle_type, brand_model) VALUES
(1, 1, 'G 4567 AB', 'MOTOR', 'Honda Vario 125 Black');

-- ==========================================
-- 4. SEED CUSTOMER
-- ==========================================
INSERT INTO customers (id, user_id, student_card_url, is_verified_student) VALUES
(1, 3, 'https://res.cloudinary.com/ojekdes/image/upload/v12345/student_card.jpg', 1);

-- ==========================================
-- 5. SEED WALLETS
-- ==========================================
INSERT INTO wallets (user_id, balance) VALUES
(1, 0),       -- Admin Wallet
(2, 50000),   -- Driver Wallet (Saldo awal Rp 50.000)
(3, 100000);  -- Customer Wallet (Saldo awal Rp 100.000)
