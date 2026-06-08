import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Menghasilkan bcrypt hash dari password plaintext.
 * Digunakan saat registrasi user atau reset password.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Memverifikasi password plaintext terhadap hash yang tersimpan di database.
 * Digunakan saat proses login.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
