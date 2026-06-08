import { DriverRepository } from '../repositories/driver.repository';
import { createAuditLog } from '../lib/audit';
import { AUDIT_ACTION, ENTITY_TYPE } from '../constants';

export class DriverService {
  /**
   * List driver dengan pagination & filter status opsional.
   */
  async list(page: number, limit: number, status: string | undefined, db: D1Database) {
    const driverRepo = new DriverRepository(db);
    return driverRepo.list(page, limit, status);
  }

  /**
   * Ambil detail driver berdasarkan ID.
   */
  async getById(id: number, db: D1Database) {
    const driverRepo = new DriverRepository(db);
    const driver = await driverRepo.findById(id);
    if (!driver) {
      throw new Error('Driver tidak ditemukan');
    }
    return driver;
  }

  /**
   * Update status driver (OFFLINE, ONLINE, BUSY, SUSPENDED).
   */
  async updateStatus(id: number, status: string, db: D1Database, actorId: number) {
    const driverRepo = new DriverRepository(db);
    const driver = await driverRepo.findById(id);
    if (!driver) {
      throw new Error('Driver tidak ditemukan');
    }

    await driverRepo.updateStatus(id, status);

    // Audit Log
    await createAuditLog(db, {
      user_id: actorId,
      action: AUDIT_ACTION.UPDATE_STATUS,
      entity_type: ENTITY_TYPE.DRIVER,
      entity_id: id,
      metadata: { new_status: status },
    });

    return driverRepo.findById(id);
  }
}
