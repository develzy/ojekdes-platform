/**
 * Utility functions untuk api-worker.
 */

/**
 * Menghasilkan order code unik dengan format: OD-{timestamp}-{random}.
 * Contoh: OD-20260608-A7F3K
 */
export function generateOrderCode(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `OD-${datePart}-${randomPart}`;
}

/**
 * Format angka menjadi format Rupiah Indonesia.
 * Hanya digunakan untuk pesan log dan audit, bukan untuk kalkulasi.
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Normalisasi nomor telepon Indonesia ke format standar (08xx).
 * Contoh: '628123...' → '08123...', '+628...' → '08...'
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('62')) return `0${cleaned.slice(2)}`;
  if (cleaned.startsWith('0')) return cleaned;
  return cleaned;
}

/**
 * Validasi format nomor telepon Indonesia.
 */
export function isValidPhone(phone: string): boolean {
  return /^(08|628)[0-9]{8,11}$/.test(phone);
}

/**
 * Buat timestamp ISO string untuk SQLite (datetime('now', 'utc') equivalent).
 */
export function nowUTC(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Ambil IP address dari Cloudflare request headers.
 */
export function getClientIP(headers: Headers): string {
  return (
    headers.get('CF-Connecting-IP') ??
    headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/**
 * Hitung jarak antara dua koordinat GPS (Haversine formula) dalam km.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radius bumi dalam km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

/**
 * Strip dangerous characters dari string input.
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>'"]/g, '');
}
