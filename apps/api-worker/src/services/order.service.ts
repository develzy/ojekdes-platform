import { OrderRepository } from '../repositories/order.repository';
import { DriverRepository } from '../repositories/driver.repository';
import { DriverMatchingRepository } from '../repositories/driver-matching.repository';
import { PaymentService } from './payment.service';
import { DriverMatchingService } from './driver-matching.service';
import { createAuditLog } from '../lib/audit';
import { AUDIT_ACTION, ENTITY_TYPE } from '../constants';
import type {
  CreateRideOrderInput,
  CreateCourierOrderInput,
  AssignDriverInput,
  RejectAssignmentInput,
  UpdateOrderStatusInput,
  OrderTrackingInput,
  CancelOrderInput,
  CreateRatingInput,
  UploadProofInput,
  OrderQueryInput,
} from '../validators/order';

// ─── State Machine ────────────────────────────────────────────────────────────
// Transisi yang diizinkan per role

const DRIVER_TRANSITIONS: Record<string, string[]> = {
  DRIVER_ASSIGNED: ['DRIVER_ARRIVED'],
  DRIVER_ARRIVED:  ['ON_TRIP'],
  ON_TRIP:         ['DELIVERED'],
  DELIVERED:       ['COMPLETED'],
};

const ADMIN_TRANSITIONS: Record<string, string[]> = {
  SEARCHING_DRIVER: ['DRIVER_ASSIGNED', 'CANCELLED'],
  DRIVER_ASSIGNED:  ['DRIVER_ARRIVED', 'CANCELLED'],
  DRIVER_ARRIVED:   ['ON_TRIP', 'CANCELLED'],
  ON_TRIP:          ['DELIVERED', 'CANCELLED'],
  DELIVERED:        ['COMPLETED', 'CANCELLED'],
};

const CANCELLABLE_STATUSES = ['SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED'];

// ─── Service ──────────────────────────────────────────────────────────────────

export class OrderService {
  /**
   * Buat order RIDE (ojek motor/bentor).
   */
  async createRideOrder(data: CreateRideOrderInput, customerId: number, db: D1Database) {
    const orderRepo = new OrderRepository(db);
    const orderId   = await orderRepo.createOrder({ ...data, service_type: 'RIDE', customer_id: customerId });

    await orderRepo.updateStatus(orderId, 'SEARCHING_DRIVER', customerId, 'Order dibuat');

    await createAuditLog(db, {
      user_id:     customerId,
      action:      AUDIT_ACTION.CREATE_ORDER,
      entity_type: ENTITY_TYPE.ORDER,
      entity_id:   orderId,
      metadata:    { service_type: 'RIDE', payment_method: data.payment_method },
    });

    // Mulai cari & broadcast ke driver terdekat
    const matchingService = new DriverMatchingService();
    await matchingService.broadcastOrder(orderId, 5, db);

    return orderRepo.findById(orderId);
  }

  /**
   * Buat order COURIER (pengiriman barang).
   */
  async createCourierOrder(data: CreateCourierOrderInput, customerId: number, db: D1Database) {
    const orderRepo = new OrderRepository(db);
    const orderId   = await orderRepo.createOrder({ ...data, service_type: 'COURIER', customer_id: customerId });

    await orderRepo.updateStatus(orderId, 'SEARCHING_DRIVER', customerId, 'Order dibuat');

    await createAuditLog(db, {
      user_id:     customerId,
      action:      AUDIT_ACTION.CREATE_ORDER,
      entity_type: ENTITY_TYPE.ORDER,
      entity_id:   orderId,
      metadata:    { service_type: 'COURIER', payment_method: data.payment_method },
    });

    // Mulai cari & broadcast ke driver terdekat
    const matchingService = new DriverMatchingService();
    await matchingService.broadcastOrder(orderId, 5, db);

    return orderRepo.findById(orderId);
  }

  /**
   * Admin assign driver ke order.
   */
  async assignDriver(orderId: number, data: AssignDriverInput, actorId: number, db: D1Database) {
    const orderRepo = new OrderRepository(db);
    const order = await orderRepo.findById(orderId);
    if (!order) throw new Error('Order tidak ditemukan');
    if (order.status !== 'SEARCHING_DRIVER') {
      throw new Error(`Order tidak dalam status SEARCHING_DRIVER (status: ${order.status})`);
    }

    const assignmentId = await orderRepo.createAssignment(orderId, data.driver_id);
    await orderRepo.setDriver(orderId, data.driver_id);
    await orderRepo.updateStatus(orderId, 'DRIVER_ASSIGNED', actorId, `Driver ID ${data.driver_id} ditugaskan`);

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.ASSIGN_DRIVER,
      entity_type: ENTITY_TYPE.ORDER,
      entity_id:   orderId,
      metadata:    { driver_id: data.driver_id, assignment_id: assignmentId },
    });

    return orderRepo.findById(orderId);
  }

  /**
   * Driver accept assignment.
   */
  async acceptAssignment(orderId: number, driverUserId: number, db: D1Database) {
    const orderRepo  = new OrderRepository(db);
    const driverRepo = new DriverRepository(db);

    const driver = await driverRepo.findByUserId(driverUserId);
    if (!driver) throw new Error('Driver tidak ditemukan');
    const driverDbId = driver.id;

    const order = await orderRepo.findById(orderId);
    if (!order) throw new Error('Order tidak ditemukan');
    if (order.driver_id !== driverDbId) throw new Error('Order bukan ditugaskan ke driver ini');
    if (order.status !== 'DRIVER_ASSIGNED') {
      throw new Error('Order sudah tidak bisa diterima');
    }

    const assignment = await orderRepo.getPendingAssignment(orderId, driverDbId);
    if (assignment) {
      await orderRepo.updateAssignmentStatus(assignment.id, 'ACCEPTED');
    }

    await createAuditLog(db, {
      user_id:     driverUserId,
      action:      AUDIT_ACTION.ACCEPT_ASSIGNMENT,
      entity_type: ENTITY_TYPE.DRIVER_ASSIGNMENT,
      entity_id:   orderId,
    });

    return orderRepo.findById(orderId);
  }

  /**
   * Driver reject assignment.
   */
  async rejectAssignment(orderId: number, driverUserId: number, data: RejectAssignmentInput, db: D1Database) {
    const orderRepo = new OrderRepository(db);
    const driverRepo = new DriverRepository(db);

    const driver = await driverRepo.findByUserId(driverUserId);
    if (!driver) throw new Error('Driver tidak ditemukan');
    const driverDbId = driver.id;

    const order = await orderRepo.findById(orderId);
    if (!order) throw new Error('Order tidak ditemukan');
    if (order.driver_id !== driverDbId) throw new Error('Order bukan ditugaskan ke driver ini');

    const assignment = await orderRepo.getPendingAssignment(orderId, driverDbId);
    if (assignment) {
      await orderRepo.updateAssignmentStatus(assignment.id, 'REJECTED');
    }

    // Reset driver dan kembali ke SEARCHING_DRIVER
    await orderRepo.setDriver(orderId, null as unknown as number);
    await orderRepo.updateStatus(orderId, 'SEARCHING_DRIVER', driverUserId, data.reason ?? 'Driver menolak');

    await createAuditLog(db, {
      user_id:     driverUserId,
      action:      AUDIT_ACTION.REJECT_ASSIGNMENT,
      entity_type: ENTITY_TYPE.DRIVER_ASSIGNMENT,
      entity_id:   orderId,
      metadata:    { reason: data.reason },
    });

    return orderRepo.findById(orderId);
  }

  /**
   * Update status order (driver/admin).
   */
  async updateStatus(
    orderId: number,
    data: UpdateOrderStatusInput,
    actorId: number,
    actorRole: string,
    db: D1Database,
  ) {
    const orderRepo = new OrderRepository(db);
    const order = await orderRepo.findById(orderId);
    if (!order) throw new Error('Order tidak ditemukan');

    const currentStatus = order.status;
    const newStatus     = data.status;

    let allowedNext: string[] | undefined;
    if (actorRole === 'driver') {
      const driverRepo = new DriverRepository(db);
      const driver = await driverRepo.findByUserId(actorId);
      if (!driver || order.driver_id !== driver.id) {
        throw new Error('Anda bukan driver yang ditugaskan untuk order ini');
      }
      allowedNext = DRIVER_TRANSITIONS[currentStatus];
    } else {
      allowedNext = ADMIN_TRANSITIONS[currentStatus];
    }

    if (!allowedNext || !allowedNext.includes(newStatus)) {
      throw new Error(
        `Tidak dapat mengubah status dari '${currentStatus}' ke '${newStatus}' dengan role '${actorRole}'`,
      );
    }

    await orderRepo.updateStatus(orderId, newStatus, actorId, data.notes);

    if (newStatus === 'COMPLETED') {
      await PaymentService.completeOrderSettlement(orderId, db);
      if (order.driver_id) {
        const matchingRepo = new DriverMatchingRepository(db);
        await matchingRepo.assignDriver(order.driver_id, null);
      }
    }

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.UPDATE_ORDER_STATUS,
      entity_type: ENTITY_TYPE.ORDER,
      entity_id:   orderId,
      metadata:    { from: currentStatus, to: newStatus, actor_role: actorRole },
    });

    return orderRepo.findById(orderId);
  }

  /**
   * Cancel order (customer/admin).
   */
  async cancelOrder(orderId: number, data: CancelOrderInput, actorId: number, actorRole: string, db: D1Database) {
    const orderRepo = new OrderRepository(db);
    const order = await orderRepo.findById(orderId);
    if (!order) throw new Error('Order tidak ditemukan');

    // Customer hanya bisa cancel jika status masih early
    if (actorRole === 'customer') {
      if (order.customer_id !== actorId) throw new Error('Anda tidak berhak membatalkan order ini');
      if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw new Error(`Order tidak dapat dibatalkan pada status '${order.status}'`);
      }
    }

    if (order.status === 'CANCELLED') throw new Error('Order sudah dibatalkan');

    await orderRepo.cancelOrder({
      order_id:     orderId,
      cancelled_by: actorId,
      reason:       data.reason,
    });

    if (order.driver_id) {
      const matchingRepo = new DriverMatchingRepository(db);
      await matchingRepo.assignDriver(order.driver_id, null);
    }

    if (order.payment_status === 'PAID') {
      const payment = await db.prepare('SELECT * FROM payment_transactions WHERE order_id = ? AND status = "PAID" LIMIT 1')
        .bind(orderId)
        .first<any>();
      if (payment) {
        await PaymentService.refundOrder(payment.id, payment.gross_amount, `Order ${order.order_number} dibatalkan`, db);
      }
    }

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.CANCEL_ORDER,
      entity_type: ENTITY_TYPE.ORDER,
      entity_id:   orderId,
      metadata:    { reason: data.reason, actor_role: actorRole },
    });
  }

  /**
   * Record driver tracking.
   */
  async recordTracking(orderId: number, data: OrderTrackingInput, driverUserId: number, db: D1Database) {
    const orderRepo = new OrderRepository(db);
    const driverRepo = new DriverRepository(db);

    const driver = await driverRepo.findByUserId(driverUserId);
    if (!driver) throw new Error('Driver tidak ditemukan');
    const driverDbId = driver.id;

    const order = await orderRepo.findById(orderId);
    if (!order) throw new Error('Order tidak ditemukan');
    if (order.driver_id !== driverDbId) throw new Error('Anda bukan driver untuk order ini');

    await orderRepo.createTracking({ order_id: orderId, driver_id: driverDbId, ...data });

    await createAuditLog(db, {
      user_id:     driverUserId,
      action:      AUDIT_ACTION.TRACK_DRIVER,
      entity_type: ENTITY_TYPE.ORDER_TRACKING,
      entity_id:   orderId,
    });
  }

  /**
   * Upload bukti foto (pickup/delivery).
   */
  async uploadProof(orderId: number, data: UploadProofInput, actorId: number, db: D1Database) {
    const orderRepo = new OrderRepository(db);
    const order = await orderRepo.findById(orderId);
    if (!order) throw new Error('Order tidak ditemukan');

    await orderRepo.uploadProof({
      order_id:    orderId,
      proof_type:  data.proof_type,
      image_url:   data.image_url,
      uploaded_by: actorId,
    });

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.UPLOAD_PROOF,
      entity_type: ENTITY_TYPE.ORDER,
      entity_id:   orderId,
      metadata:    { proof_type: data.proof_type },
    });
  }

  /**
   * Customer beri rating ke driver setelah COMPLETED.
   */
  async createRating(orderId: number, data: CreateRatingInput, customerId: number, db: D1Database) {
    const orderRepo = new OrderRepository(db);
    const order = await orderRepo.findById(orderId);
    if (!order) throw new Error('Order tidak ditemukan');
    if (order.customer_id !== customerId) throw new Error('Anda tidak berhak memberikan rating untuk order ini');
    if (order.status !== 'COMPLETED') throw new Error('Rating hanya bisa diberikan setelah order selesai');
    if (!order.driver_id) throw new Error('Order tidak memiliki driver');

    await orderRepo.createRating({
      order_id:    orderId,
      customer_id: customerId,
      driver_id:   order.driver_id,
      rating:      data.rating,
      review:      data.review,
    });

    await createAuditLog(db, {
      user_id:     customerId,
      action:      AUDIT_ACTION.CREATE_RATING,
      entity_type: ENTITY_TYPE.ORDER,
      entity_id:   orderId,
      metadata:    { rating: data.rating },
    });
  }

  /**
   * Ambil detail order lengkap.
   */
  async getOrderDetail(orderId: number, db: D1Database) {
    const orderRepo = new OrderRepository(db);
    const order = await orderRepo.findDetailById(orderId);
    if (!order) throw new Error('Order tidak ditemukan');
    return order;
  }

  /**
   * List order dengan filter role-aware.
   */
  async listOrders(
    query: OrderQueryInput,
    actorId: number,
    actorRole: string,
    db: D1Database,
  ) {
    const orderRepo = new OrderRepository(db);

    let customerId  = query.customer_id;
    let driverId    = query.driver_id;

    // Role enforcement
    if (actorRole === 'customer') {
      customerId = actorId; // customer hanya lihat order sendiri
    } else if (actorRole === 'driver') {
      const driverRepo = new DriverRepository(db);
      const driver = await driverRepo.findByUserId(actorId);
      driverId = driver ? driver.id : -1; // driver hanya lihat order mereka
    }

    return orderRepo.listOrders(
      query.page,
      query.limit,
      query.status,
      query.service_type,
      customerId,
      driverId,
      query.merchant_id,
    );
  }
}
