import { DriverMatchingRepository, NearbyDriverRow } from '../repositories/driver-matching.repository';
import { DriverRepository } from '../repositories/driver.repository';
import { OrderRepository } from '../repositories/order.repository';
import { createAuditLog } from '../lib/audit';
import { AUDIT_ACTION, ENTITY_TYPE } from '../constants';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius bumi dalam km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class DriverMatchingService {
  /**
   * Set driver online.
   */
  async setDriverOnline(driverUserId: number, db: D1Database): Promise<void> {
    const driverRepo = new DriverRepository(db);
    const driver = await driverRepo.findByUserId(driverUserId);
    if (!driver) throw new Error('Driver tidak ditemukan');

    const matchingRepo = new DriverMatchingRepository(db);
    await matchingRepo.setOnlineStatus(driver.id, true);

    await createAuditLog(db, {
      user_id:     driverUserId,
      action:      AUDIT_ACTION.DRIVER_ONLINE,
      entity_type: ENTITY_TYPE.DRIVER,
      entity_id:   driver.id,
    });
  }

  /**
   * Set driver offline.
   */
  async setDriverOffline(driverUserId: number, db: D1Database): Promise<void> {
    const driverRepo = new DriverRepository(db);
    const driver = await driverRepo.findByUserId(driverUserId);
    if (!driver) throw new Error('Driver tidak ditemukan');

    const matchingRepo = new DriverMatchingRepository(db);
    await matchingRepo.setOnlineStatus(driver.id, false);

    await createAuditLog(db, {
      user_id:     driverUserId,
      action:      AUDIT_ACTION.DRIVER_OFFLINE,
      entity_type: ENTITY_TYPE.DRIVER,
      entity_id:   driver.id,
    });
  }

  /**
   * Update lokasi real-time driver.
   */
  async updateDriverLocation(
    driverUserId: number,
    data: { latitude: number; longitude: number; accuracy?: number | null },
    db: D1Database,
  ): Promise<void> {
    const driverRepo = new DriverRepository(db);
    const driver = await driverRepo.findByUserId(driverUserId);
    if (!driver) throw new Error('Driver tidak ditemukan');

    const matchingRepo = new DriverMatchingRepository(db);
    await matchingRepo.updateDriverLocation(driver.id, data.latitude, data.longitude, data.accuracy);

    await createAuditLog(db, {
      user_id:     driverUserId,
      action:      AUDIT_ACTION.UPDATE_LOCATION,
      entity_type: ENTITY_TYPE.DRIVER,
      entity_id:   driver.id,
      metadata:    { latitude: data.latitude, longitude: data.longitude },
    });
  }

  /**
   * Cari driver online & available terdekat (Haversine).
   */
  async findNearbyDrivers(
    lat: number,
    lon: number,
    maxRadiusKm: number,
    db: D1Database,
  ): Promise<(NearbyDriverRow & { distance_km: number })[]> {
    const deltaLat = maxRadiusKm / 111.0;
    const deltaLon = maxRadiusKm / (111.0 * Math.cos((lat * Math.PI) / 180.0));

    const minLat = lat - deltaLat;
    const maxLat = lat + deltaLat;
    const minLon = lon - deltaLon;
    const maxLon = lon + deltaLon;

    const matchingRepo = new DriverMatchingRepository(db);
    const rows = await matchingRepo.findNearbyDrivers(minLat, maxLat, minLon, maxLon);

    const nearby = rows
      .map((row) => {
        const dist = calculateDistance(lat, lon, row.current_latitude, row.current_longitude);
        return { ...row, distance_km: dist };
      })
      .filter((d) => d.distance_km <= maxRadiusKm);

    // Sort: 1. Jarak terdekat, 2. Rating tertinggi
    nearby.sort((a, b) => {
      if (Math.abs(a.distance_km - b.distance_km) > 0.001) {
        return a.distance_km - b.distance_km;
      }
      return b.rating - a.rating;
    });

    return nearby;
  }

  /**
   * Inisialisasi matching queue & kirim broadcast pertama.
   */
  async broadcastOrder(orderId: number, maxRadiusKm: number, db: D1Database): Promise<void> {
    const orderRepo = new OrderRepository(db);
    const order = await orderRepo.findById(orderId);
    if (!order) throw new Error('Order tidak ditemukan');

    // Cari driver terdekat
    const drivers = await this.findNearbyDrivers(
      order.pickup_latitude,
      order.pickup_longitude,
      maxRadiusKm,
      db,
    );

    if (drivers.length === 0) {
      // Tidak ada driver terdekat, biarkan status tetap SEARCHING_DRIVER
      await createAuditLog(db, {
        user_id:     order.customer_id,
        action:      AUDIT_ACTION.BROADCAST_ORDER,
        entity_type: ENTITY_TYPE.ORDER,
        entity_id:   orderId,
        metadata:    { result: 'NO_DRIVERS_FOUND' },
      });
      return;
    }

    const matchingRepo = new DriverMatchingRepository(db);

    // Insert ke queue
    let priority = 1;
    for (const d of drivers) {
      await matchingRepo.createBroadcast(orderId, d.driver_id, priority, d.distance_km);
      await matchingRepo.logHistory(orderId, d.driver_id, 'BROADCAST');
      priority++;
    }

    await createAuditLog(db, {
      user_id:     order.customer_id,
      action:      AUDIT_ACTION.BROADCAST_ORDER,
      entity_type: ENTITY_TYPE.ORDER,
      entity_id:   orderId,
      metadata:    { drivers_broadcasted: drivers.length },
    });

    // Mulai kirim broadcast ke prioritas pertama
    await this.retryBroadcast(orderId, db);
  }

  /**
   * Driver menyetujui broadcast penugasan.
   */
  async acceptOrder(orderId: number, driverUserId: number, db: D1Database): Promise<void> {
    const driverRepo = new DriverRepository(db);
    const driver = await driverRepo.findByUserId(driverUserId);
    if (!driver) throw new Error('Driver tidak ditemukan');

    const matchingRepo = new DriverMatchingRepository(db);
    const orderRepo = new OrderRepository(db);

    const queue = await matchingRepo.getDriverQueue(orderId);
    const myQueue = queue.find((q) => q.driver_id === driver.id && q.status === 'SENT');
    if (!myQueue) {
      throw new Error('Penugasan tidak ditemukan atau sudah kedaluwarsa');
    }

    // Eksekusi accept matching
    await matchingRepo.acceptAssignment(orderId, driver.id);

    // Update orders table
    await orderRepo.setDriver(orderId, driver.id);
    await orderRepo.updateStatus(orderId, 'DRIVER_ASSIGNED', driverUserId, 'Driver menerima broadcast order');

    await createAuditLog(db, {
      user_id:     driverUserId,
      action:      AUDIT_ACTION.ACCEPT_ORDER,
      entity_type: ENTITY_TYPE.DRIVER,
      entity_id:   driver.id,
      metadata:    { order_id: orderId },
    });
  }

  /**
   * Driver menolak broadcast penugasan.
   */
  async rejectOrder(orderId: number, driverUserId: number, db: D1Database): Promise<void> {
    const driverRepo = new DriverRepository(db);
    const driver = await driverRepo.findByUserId(driverUserId);
    if (!driver) throw new Error('Driver tidak ditemukan');

    const matchingRepo = new DriverMatchingRepository(db);
    const queue = await matchingRepo.getDriverQueue(orderId);
    const myQueue = queue.find((q) => q.driver_id === driver.id && q.status === 'SENT');
    if (!myQueue) {
      throw new Error('Penugasan tidak ditemukan atau sudah kedaluwarsa');
    }

    // Reject queue
    await matchingRepo.rejectAssignment(orderId, driver.id);

    // Reset driver pada order & set kembali ke SEARCHING_DRIVER agar driver lain bisa diproses
    const orderRepo = new OrderRepository(db);
    await orderRepo.setDriver(orderId, null as unknown as number);
    await orderRepo.updateStatus(orderId, 'SEARCHING_DRIVER', driverUserId, 'Driver menolak broadcast');

    await createAuditLog(db, {
      user_id:     driverUserId,
      action:      AUDIT_ACTION.REJECT_ORDER,
      entity_type: ENTITY_TYPE.DRIVER,
      entity_id:   driver.id,
      metadata:    { order_id: orderId },
    });

    // Cari driver berikutnya
    await this.retryBroadcast(orderId, db);
  }

  /**
   * Timeout broadcast penugasan.
   */
  async expireAssignment(orderId: number, driverId: number, db: D1Database): Promise<void> {
    const matchingRepo = new DriverMatchingRepository(db);
    const queue = await matchingRepo.getDriverQueue(orderId);
    const targetQueue = queue.find((q) => q.driver_id === driverId && q.status === 'SENT');
    if (!targetQueue) return;

    await matchingRepo.expireAssignment(orderId, driverId);

    // Reset order
    const orderRepo = new OrderRepository(db);
    await orderRepo.setDriver(orderId, null as unknown as number);
    await orderRepo.updateStatus(orderId, 'SEARCHING_DRIVER', driverId, 'Broadcast assignment timeout');

    await createAuditLog(db, {
      user_id:     driverId,
      action:      AUDIT_ACTION.TIMEOUT_ASSIGNMENT,
      entity_type: ENTITY_TYPE.ORDER,
      entity_id:   orderId,
    });

    // Cari driver berikutnya
    await this.retryBroadcast(orderId, db);
  }

  /**
   * Mengirim broadcast ke driver berikutnya di antrean queue.
   */
  async retryBroadcast(orderId: number, db: D1Database): Promise<void> {
    const matchingRepo = new DriverMatchingRepository(db);
    const orderRepo = new OrderRepository(db);

    const queue = await matchingRepo.getDriverQueue(orderId);

    // Cari queue item prioritas tertinggi (angka priority terkecil) yang masih PENDING
    const nextQueue = queue.find((q) => q.status === 'PENDING');

    if (nextQueue) {
      // Tandai queue item sebagai SENT
      await matchingRepo.markQueueSent(nextQueue.id);

      // Assign driver sementara ke order dan ubah status ke DRIVER_ASSIGNED agar driver melihatnya
      await orderRepo.setDriver(orderId, nextQueue.driver_id);
      await orderRepo.updateStatus(
        orderId,
        'DRIVER_ASSIGNED',
        nextQueue.driver_id,
        `Broadcast order dikirim ke driver prioritas ${nextQueue.priority}`,
      );

      // Cari user_id milik driver untuk logs
      const driverRepo = new DriverRepository(db);
      const driver = await driverRepo.findById(nextQueue.driver_id);
      if (driver) {
        await createAuditLog(db, {
          user_id:     driver.user_id,
          action:      AUDIT_ACTION.AUTO_ASSIGN_DRIVER,
          entity_type: ENTITY_TYPE.ORDER,
          entity_id:   orderId,
          metadata:    { driver_id: nextQueue.driver_id, priority: nextQueue.priority },
        });
      }
    } else {
      // Seluruh driver di queue sudah diproses & ditolak/expired
      await orderRepo.setDriver(orderId, null as unknown as number);
      await orderRepo.updateStatus(
        orderId,
        'SEARCHING_DRIVER',
        null as unknown as number,
        'Seluruh driver terdekat telah menolak atau timeout',
      );
    }
  }

  /**
   * Ambil matching queue untuk order.
   */
  async getDriverQueue(orderId: number, db: D1Database) {
    const matchingRepo = new DriverMatchingRepository(db);
    return matchingRepo.getDriverQueue(orderId);
  }
}
