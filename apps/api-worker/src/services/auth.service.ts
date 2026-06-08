import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { DriverRepository } from '../repositories/driver.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiry,
  verifyRefreshToken,
} from '@ojekdes/shared-auth';
import { createAuditLog } from '../lib/audit';
import { AUDIT_ACTION, ENTITY_TYPE } from '../constants';
import type { Env } from '../types/bindings';
import type { AuthResponse, JWTPayload } from '@ojekdes/shared-types';

export class AuthService {
  /**
   * Registrasi user baru (customer atau driver).
   */
  async register(
    data: {
      phone: string;
      email?: string | null;
      password: string;
      role: 'super_admin' | 'admin' | 'operator' | 'customer' | 'driver';
      fullName: string;
      licenseNumber?: string; // Khusus driver
    },
    db: D1Database,
    env: Env,
  ): Promise<AuthResponse> {
    const userRepo = new UserRepository(db);
    const sessionRepo = new SessionRepository(db);
    const customerRepo = new CustomerRepository(db);
    const driverRepo = new DriverRepository(db);
    const walletRepo = new WalletRepository(db);

    // 1. Cek duplikasi phone
    const existingPhone = await userRepo.findByPhone(data.phone);
    if (existingPhone) {
      throw new Error('Nomor telepon sudah terdaftar');
    }

    // 2. Cek duplikasi email jika diisi
    if (data.email) {
      const existingEmail = await userRepo.findByEmail(data.email);
      if (existingEmail) {
        throw new Error('Email sudah terdaftar');
      }
    }

    // 3. Hash password
    const passwordHash = await hashPassword(data.password);

    // 4. Simpan user & profile
    const userId = await userRepo.create({
      phone: data.phone,
      email: data.email,
      password_hash: passwordHash,
      role: data.role,
    });

    await userRepo.createProfile(userId, data.fullName);

    // 5. Simpan ke tabel spesifik role & buat wallet
    if (data.role === 'customer') {
      await customerRepo.create(userId);
    } else if (data.role === 'driver') {
      await driverRepo.create(userId, data.licenseNumber || 'PENDING');
    }

    await walletRepo.create(userId, 0);

    // 6. Buat session token
    const expiresAt = getRefreshTokenExpiry();
    const tempSessionId = crypto.randomUUID(); // Temporary session ID to link tokens and DB
    const refreshToken = await generateRefreshToken(
      { sub: String(userId), sessionId: tempSessionId },
      env.JWT_REFRESH_SECRET,
    );
    const tokenHash = await hashRefreshToken(refreshToken);

    const sessionId = await sessionRepo.create(userId, tokenHash, expiresAt);

    // Regenerate tokens with the actual database sessionId if needed, or use the database sessionId directly
    const actualSessionId = String(sessionId);
    const finalRefreshToken = await generateRefreshToken(
      { sub: String(userId), sessionId: actualSessionId },
      env.JWT_REFRESH_SECRET,
    );
    const finalTokenHash = await hashRefreshToken(finalRefreshToken);

    // Update session token hash in DB to match the final token
    await db.prepare('UPDATE sessions SET refresh_token_hash = ? WHERE id = ?').bind(finalTokenHash, sessionId).run();

    const accessToken = await generateAccessToken(
      { sub: String(userId), role: data.role, sessionId: actualSessionId },
      env.JWT_ACCESS_SECRET,
    );

    // 7. Catat audit log
    await createAuditLog(db, {
      user_id: userId,
      action: AUDIT_ACTION.REGISTER,
      entity_type: ENTITY_TYPE.USER,
      entity_id: userId,
      metadata: { role: data.role, phone: data.phone },
    });

    return {
      accessToken,
      refreshToken: finalRefreshToken,
      user: {
        id: userId,
        phone: data.phone,
        email: data.email || undefined,
        role: data.role,
        profile: {
          full_name: data.fullName,
        },
      },
    };
  }

  /**
   * Login user dengan phone & password.
   */
  async login(
    data: { phone: string; password: string },
    db: D1Database,
    env: Env,
  ): Promise<AuthResponse> {
    const userRepo = new UserRepository(db);
    const sessionRepo = new SessionRepository(db);

    // 1. Cari user
    const user = await userRepo.findByPhone(data.phone);
    if (!user) {
      throw new Error('Nomor telepon atau password salah');
    }

    if (!user.is_active) {
      throw new Error('Akun dinonaktifkan, silakan hubungi admin');
    }

    // 2. Verifikasi password
    const isPasswordValid = await verifyPassword(data.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Nomor telepon atau password salah');
    }

    // 3. Ambil detail profile
    const userWithProfile = await userRepo.findById(user.id);
    const fullName = userWithProfile?.full_name || 'User OjekDes';
    const avatarUrl = userWithProfile?.avatar_url || undefined;

    // 4. Generate refresh token & session
    const expiresAt = getRefreshTokenExpiry();
    const tempSessionId = crypto.randomUUID();
    const refreshToken = await generateRefreshToken(
      { sub: String(user.id), sessionId: tempSessionId },
      env.JWT_REFRESH_SECRET,
    );
    const tokenHash = await hashRefreshToken(refreshToken);

    const sessionId = await sessionRepo.create(user.id, tokenHash, expiresAt);

    const actualSessionId = String(sessionId);
    const finalRefreshToken = await generateRefreshToken(
      { sub: String(user.id), sessionId: actualSessionId },
      env.JWT_REFRESH_SECRET,
    );
    const finalTokenHash = await hashRefreshToken(finalRefreshToken);

    // Update session token hash in DB to match the final token
    await db.prepare('UPDATE sessions SET refresh_token_hash = ? WHERE id = ?').bind(finalTokenHash, sessionId).run();

    const accessToken = await generateAccessToken(
      { sub: String(user.id), role: user.role, sessionId: actualSessionId },
      env.JWT_ACCESS_SECRET,
    );

    // 5. Audit Log
    await createAuditLog(db, {
      user_id: user.id,
      action: AUDIT_ACTION.LOGIN,
      entity_type: ENTITY_TYPE.SESSION,
      entity_id: sessionId,
    });

    return {
      accessToken,
      refreshToken: finalRefreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email || undefined,
        role: user.role,
        profile: {
          full_name: fullName,
          avatar_url: avatarUrl,
        },
      },
    };
  }

  /**
   * Refresh access token & rotate refresh token.
   */
  async refresh(
    refreshToken: string,
    db: D1Database,
    env: Env,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const sessionRepo = new SessionRepository(db);
    const userRepo = new UserRepository(db);

    // 1. Verifikasi token signature & expiry
    const payload = await verifyRefreshToken(refreshToken, env.JWT_REFRESH_SECRET);
    if (!payload) {
      throw new Error('Invalid or expired refresh token');
    }

    const userId = Number(payload.sub);
    const oldSessionId = Number(payload.sessionId);

    // 2. Verifikasi dengan database session
    const tokenHash = await hashRefreshToken(refreshToken);
    const session = await sessionRepo.findByTokenHash(tokenHash);

    if (!session || session.user_id !== userId || session.id !== oldSessionId) {
      // Potensi token reuse/hijacking: hapus semua session user ini demi keamanan
      await sessionRepo.deleteByUserId(userId);
      throw new Error('Refresh token revoked due to security policy');
    }

    // 3. Cari detail user untuk payload access token
    const user = await userRepo.findById(userId);
    if (!user || !user.is_active) {
      await sessionRepo.deleteByUserId(userId);
      throw new Error('User is no longer active or exists');
    }

    // 4. Hapus session lama (rotasi token)
    await sessionRepo.deleteByTokenHash(tokenHash);

    // 5. Buat session baru
    const expiresAt = getRefreshTokenExpiry();
    const tempSessionId = crypto.randomUUID();
    const newRefreshToken = await generateRefreshToken(
      { sub: String(userId), sessionId: tempSessionId },
      env.JWT_REFRESH_SECRET,
    );
    const newHash = await hashRefreshToken(newRefreshToken);

    const newSessionId = await sessionRepo.create(userId, newHash, expiresAt);

    const actualSessionId = String(newSessionId);
    const finalRefreshToken = await generateRefreshToken(
      { sub: String(userId), sessionId: actualSessionId },
      env.JWT_REFRESH_SECRET,
    );
    const finalTokenHash = await hashRefreshToken(finalRefreshToken);

    await db.prepare('UPDATE sessions SET refresh_token_hash = ? WHERE id = ?').bind(finalTokenHash, newSessionId).run();

    const accessToken = await generateAccessToken(
      { sub: String(userId), role: user.role, sessionId: actualSessionId },
      env.JWT_ACCESS_SECRET,
    );

    // 6. Audit Log
    await createAuditLog(db, {
      user_id: userId,
      action: AUDIT_ACTION.REFRESH_TOKEN,
      entity_type: ENTITY_TYPE.SESSION,
      entity_id: newSessionId,
    });

    return {
      accessToken,
      refreshToken: finalRefreshToken,
    };
  }

  /**
   * Logout user dengan menghapus session miliknya.
   */
  async logout(userId: number, db: D1Database): Promise<void> {
    const sessionRepo = new SessionRepository(db);

    // Hapus semua session milik user
    await sessionRepo.deleteByUserId(userId);

    // Audit Log
    await createAuditLog(db, {
      user_id: userId,
      action: AUDIT_ACTION.LOGOUT,
      entity_type: ENTITY_TYPE.SESSION,
    });
  }

  /**
   * Mengambil data profil user yang sedang login.
   */
  async getMe(userId: number, db: D1Database): Promise<any> {
    const userRepo = new UserRepository(db);
    const walletRepo = new WalletRepository(db);

    const user = await userRepo.findById(userId);
    if (!user) {
      throw new Error('User tidak ditemukan');
    }

    const wallet = await walletRepo.findByUserId(userId);

    // Ambil detail role-specific
    let roleDetails = null;
    if (user.role === 'customer') {
      const customerRepo = new CustomerRepository(db);
      roleDetails = await customerRepo.findByUserId(userId);
    } else if (user.role === 'driver') {
      const driverRepo = new DriverRepository(db);
      roleDetails = await driverRepo.findByUserId(userId);
    }

    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      profile: {
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      },
      wallet: wallet
        ? {
            id: wallet.id,
            balance: wallet.balance,
          }
        : null,
      role_details: roleDetails,
    };
  }
}
