import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';
import type { JWTPayload } from '@ojekdes/shared-types';

const ACCESS_TOKEN_TTL = '15m';   // 15 menit
const REFRESH_TOKEN_TTL = '30d';  // 30 hari

function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/**
 * Menghasilkan JWT Access Token.
 * TTL: 15 menit.
 */
export async function generateAccessToken(
  payload: JWTPayload,
  secret: string,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecretKey(secret));
}

/**
 * Menghasilkan JWT Refresh Token.
 * TTL: 30 hari. Hanya menyimpan sub & sessionId, tanpa role.
 */
export async function generateRefreshToken(
  payload: Pick<JWTPayload, 'sub' | 'sessionId'>,
  secret: string,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(getSecretKey(secret));
}

/**
 * Memverifikasi JWT Access Token.
 * Mengembalikan payload jika valid, null jika tidak valid atau kadaluarsa.
 */
export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(secret));
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Memverifikasi JWT Refresh Token.
 * Mengembalikan payload jika valid, null jika tidak valid atau kadaluarsa.
 */
export async function verifyRefreshToken(
  token: string,
  secret: string,
): Promise<Pick<JWTPayload, 'sub' | 'sessionId'> | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(secret));
    return payload as unknown as Pick<JWTPayload, 'sub' | 'sessionId'>;
  } catch {
    return null;
  }
}
