-- Enforce Foreign Keys
PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. SEED TARIFFS
-- ==========================================
INSERT INTO tariffs (service_type, base_distance, base_price, additional_price_per_km, active_status, effective_date) VALUES
('MOTOR', 2.0, 12000, 3000, 1, '2026-06-01'),
('BENTOR', 2.0, 15000, 4000, 1, '2026-06-01'),
('PELAJAR', 2.0, 10000, 2500, 1, '2026-06-01');

-- ==========================================
-- 2. SEED TARIFF ADJUSTMENTS
-- ==========================================
INSERT INTO tariff_adjustments (adjustment_name, adjustment_type, adjustment_mode, adjustment_value, active_status) VALUES
('Diskon Pelajar', 'student_discount', 'flat', 2000, 1),
('Surcharge Jalan Rusak', 'damaged_road', 'flat', 2500, 1),
('Surcharge Jalan Menanjak', 'uphill_road', 'flat', 3000, 1),
('Surcharge Area Terpencil', 'remote_area', 'flat', 2000, 1),
('Biaya Layanan Malam', 'night_fee', 'flat', 1500, 1),
('Biaya Cuaca Buruk', 'weather_fee', 'flat', 2000, 1);
