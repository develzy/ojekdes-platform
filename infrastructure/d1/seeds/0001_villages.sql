-- Enforce Foreign Keys
PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. SEED PROVINCE, REGENCY, DISTRICT
-- ==========================================
INSERT INTO provinces (province_code, province_name, status) 
VALUES ('33', 'JAWA TENGAH', 1);

INSERT INTO regencies (province_id, regency_code, regency_name, status) 
VALUES (1, '3328', 'TEGAL', 1);

INSERT INTO districts (regency_id, district_code, district_name, status) 
VALUES (1, '332801', 'MARGASARI', 1);

-- ==========================================
-- 2. SEED ZONES
-- ==========================================
INSERT INTO zones (zone_code, zone_name, zone_type, description, status) VALUES
('ZONE_A', 'CORE AREA', 'CORE', 'Pusat Kecamatan Margasari, jalan aspal datar, sinyal stabil', 1),
('ZONE_B', 'RURAL AREA', 'RURAL', 'Area pedesaan Margasari, medan bervariasi', 1),
('ZONE_C', 'REMOTE AREA', 'REMOTE', 'Area terpencil/pegunungan, medan berat, minim sinyal', 1);

-- ==========================================
-- 3. SEED 13 VILLAGES IN MARGASARI
-- ==========================================
INSERT INTO villages (district_id, village_code, village_name, latitude, longitude, is_active_service_area, status) VALUES
(1, '3328012001', 'DANARAJA', -7.1895, 109.0435, 1, 1),
(1, '3328012002', 'DUKUH TENGAH', -7.1528, 109.0345, 0, 1),
(1, '3328012003', 'JATILABA', -7.1352, 109.0520, 0, 1),
(1, '3328012004', 'JEMBAYAT', -7.1264, 109.0392, 0, 1),
(1, '3328012005', 'KALIGAYAM', -7.1645, 109.0595, 1, 1),
(1, '3328012006', 'KALISALAK', -7.1942, 109.0223, 1, 1),
(1, '3328012007', 'KARANGDAWA', -7.1724, 109.0489, 1, 1),
(1, '3328012008', 'MARGA AYU', -7.1510, 109.0720, 0, 1),
(1, '3328012009', 'MARGASARI', -7.1601, 109.0375, 0, 1),
(1, '3328012010', 'PAKULAUT', -7.1420, 109.0335, 0, 1),
(1, '3328012011', 'PRUPUK SELATAN', -7.2105, 109.0118, 1, 1),
(1, '3328012012', 'PRUPUK UTARA', -7.1990, 109.0090, 0, 1),
(1, '3328012013', 'WANASARI', -7.1812, 109.0745, 0, 1);

-- ==========================================
-- 4. SEED SERVICE AREAS (MVP ACTIVE AREA BINDINGS)
-- ==========================================
-- Danaraja (ZONE_A), Kaligayam (ZONE_A), Karangdawa (ZONE_A), Kalisalak (ZONE_B), Prupuk Selatan (ZONE_B)
INSERT INTO service_areas (village_id, zone_id, coverage_type, status) VALUES
(1, 1, 'full', 1), -- Danaraja
(2, 2, 'none', 0), -- Dukuh Tengah (inactive)
(3, 2, 'none', 0), -- Jatilaba (inactive)
(4, 2, 'none', 0), -- Jembayat (inactive)
(5, 1, 'full', 1), -- Kaligayam
(6, 2, 'full', 1), -- Kalalisak
(7, 1, 'full', 1), -- Karangdawa
(8, 3, 'none', 0), -- Marga Ayu (inactive)
(9, 1, 'none', 0), -- Margasari (inactive)
(10, 2, 'none', 0), -- Pakulaut (inactive)
(11, 2, 'full', 1), -- Prupuk Selatan
(12, 2, 'none', 0), -- Prupuk Utara (inactive)
(13, 3, 'none', 0); -- Wanasari (inactive)
