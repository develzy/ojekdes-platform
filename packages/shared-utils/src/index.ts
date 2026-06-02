/**
 * Mengubah nilai numerik menjadi format mata uang Rupiah (IDR)
 * Contoh: 15000 -> "Rp 15.000"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value).replace(/\s+/g, ' '); // Menghilangkan spasi aneh di beberapa browser
}

/**
 * Memformat jarak numerik menjadi teks dengan satuan KM
 * Contoh: 4.256 -> "4.3 km"
 */
export function formatDistance(value: number): string {
  return `${value.toFixed(1).replace('.', ',')} km`;
}

/**
 * Memformat string tanggal atau objek Date menjadi format standar lokal (DD MMMM YYYY, HH:mm)
 */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  
  if (isNaN(date.getTime())) {
    return 'Tanggal tidak valid';
  }
  
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}
