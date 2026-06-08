import { UserRepository } from '../repositories/user.repository';
import { createAuditLog } from '../lib/audit';
import { AUDIT_ACTION, ENTITY_TYPE } from '../constants';

export class UserService {
  /**
   * List user dengan pagination & filter role opsional.
   */
  async list(page: number, limit: number, role: string | undefined, db: D1Database) {
    const userRepo = new UserRepository(db);
    return userRepo.list(page, limit, role);
  }

  /**
   * Ambil detail user berdasarkan ID.
   */
  async getById(id: number, db: D1Database) {
    const userRepo = new UserRepository(db);
    const user = await userRepo.findById(id);
    if (!user) {
      throw new Error('User tidak ditemukan');
    }
    return user;
  }

  /**
   * Update data user & profile.
   */
  async update(
    id: number,
    data: {
      email?: string | null;
      fullName?: string;
      avatarUrl?: string | null;
      isActive?: number;
    },
    db: D1Database,
    actorId: number,
  ) {
    const userRepo = new UserRepository(db);
    const user = await userRepo.findById(id);
    if (!user) {
      throw new Error('User tidak ditemukan');
    }

    // Update users table
    if (data.email !== undefined || data.isActive !== undefined) {
      await userRepo.update(id, {
        email: data.email,
        is_active: data.isActive,
      });
    }

    // Update user_profiles table
    if (data.fullName !== undefined || data.avatarUrl !== undefined) {
      const fields: string[] = [];
      const params: any[] = [];

      if (data.fullName !== undefined) {
        fields.push('full_name = ?');
        params.push(data.fullName);
      }
      if (data.avatarUrl !== undefined) {
        fields.push('avatar_url = ?');
        params.push(data.avatarUrl);
      }

      if (fields.length > 0) {
        fields.push(`updated_at = datetime('now', 'utc')`);
        params.push(id);

        await db
          .prepare(`UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = ?`)
          .bind(...params)
          .run();
      }
    }

    const updatedUser = await userRepo.findById(id);

    // Audit Log
    await createAuditLog(db, {
      user_id: actorId,
      action: AUDIT_ACTION.UPDATE,
      entity_type: ENTITY_TYPE.USER,
      entity_id: id,
      metadata: { updated_fields: Object.keys(data) },
    });

    return updatedUser;
  }

  /**
   * Nonaktifkan user (Soft delete & set is_active ke 0).
   */
  async deactivate(id: number, db: D1Database, actorId: number) {
    const userRepo = new UserRepository(db);
    const user = await userRepo.findById(id);
    if (!user) {
      throw new Error('User tidak ditemukan');
    }

    await userRepo.softDelete(id);

    // Audit Log
    await createAuditLog(db, {
      user_id: actorId,
      action: AUDIT_ACTION.DEACTIVATE,
      entity_type: ENTITY_TYPE.USER,
      entity_id: id,
    });
  }
}
