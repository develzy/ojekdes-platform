# OjekDes Kalisalak - D1 Database Infrastructure

Direktori ini berisi seluruh skema database (DDL), data inisialisasi/uji (DML), serta skrip otomatisasi pengelolaan Cloudflare D1 Database (SQLite Serverless).

## Struktur Folder

```text
infrastructure/d1/
├── migrations/       # Versi skema DDL SQL murni
│   ├── 0001_initial_base.sql
│   ├── 0002_location_master.sql
│   ├── 0003_education_master.sql
│   ├── 0004_driver_module.sql
│   ├── 0005_customer_module.sql
│   ├── 0006_order_module.sql
│   └── 0007_payment_module.sql
├── seeds/            # Data awal dan data uji coba lokal
│   ├── 0001_villages.sql  # Master Geografi Desa Margasari
│   ├── 0002_tariffs.sql   # Tarif Dasar & Penyesuaian
│   └── dev_seed.sql       # Akun Uji Coba Pengembang (Admin, Driver, Customer)
├── scripts/          # Skrip otomatisasi (Bash & PowerShell)
│   ├── migrate.sh / migrate.ps1
│   ├── seed.sh / seed.ps1
│   └── reset.sh / reset.ps1
└── README.md         # Dokumentasi ini
```

## Cara Penggunaan (Otomatisasi Skrip)

Skrip otomatisasi disediakan dalam versi Bash (`.sh` untuk Git Bash, Linux, macOS) dan PowerShell (`.ps1` untuk native Windows). Jalankan skrip ini dari terminal.

### 1. Reset Database Lokal
Menghapus seluruh state D1 lokal, menjalankan migrasi skema dari nol, dan menyemai seluruh data uji.
* **Bash / Git Bash**:
  ```bash
  ./infrastructure/d1/scripts/reset.sh
  ```
* **PowerShell**:
  ```powershell
  .\infrastructure/d1/scripts\reset.ps1
  ```

### 2. Jalankan Migrasi Saja
Menerapkan skema migrasi baru yang belum teraplikasi ke database lokal.
* **Bash**:
  ```bash
  ./infrastructure/d1/scripts/migrate.sh
  ```
* **PowerShell**:
  ```powershell
  .\infrastructure/d1/scripts\migrate.ps1
  ```

### 3. Jalankan Seeding Saja
Menyemai data desa, tarif, dan akun pengujian baru ke database lokal.
* **Bash**:
  ```bash
  ./infrastructure/d1/scripts/seed.sh
  ```
* **PowerShell**:
  ```powershell
  .\infrastructure/d1/scripts\seed.ps1
  ```

## Akun Pengujian Lokal (dari `dev_seed.sql`)

Semua akun pengujian menggunakan password standar: **`password123`**

1. **Admin**:
   - Phone: `081234567890`
   - Email: `admin@ojekdes.com`
2. **Driver**:
   - Phone: `081234567891`
   - Email: `driver@ojekdes.com`
   - Vehicle: Honda Vario 125 Black (`G 4567 AB`)
3. **Customer**:
   - Phone: `081234567892`
   - Email: `customer@ojekdes.com`
