import { MerchantOrderRepository } from '../repositories/merchant-order.repository';
import { MerchantProductRepository } from '../repositories/merchant-product.repository';
import { MerchantRepository } from '../repositories/merchant.repository';
import { PaymentService } from './payment.service';
import { createAuditLog } from '../lib/audit';
import { AUDIT_ACTION, ENTITY_TYPE } from '../constants';
import type { CreateMerchantOrderInput, UpdateMerchantOrderStatusInput, MerchantOrderQueryInput } from '../validators/merchant';

// ─── Status Transition Rules ──────────────────────────────────────────────────
// Definisikan transisi yang diizinkan per role

const MERCHANT_TRANSITIONS: Record<string, string[]> = {
  PENDING:  ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP'],
};

const DRIVER_TRANSITIONS: Record<string, string[]> = {
  READY_FOR_PICKUP: ['PICKED_UP'],
  PICKED_UP: ['DELIVERED'],
};

const ADMIN_TRANSITIONS: Record<string, string[]> = {
  PENDING:          ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:        ['PREPARING', 'CANCELLED'],
  PREPARING:        ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP:        ['DELIVERED', 'CANCELLED'],
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class MerchantOrderService {
  /**
   * Buat order merchant baru dari customer.
   * Validasi: merchant APPROVED, produk tersedia, stok cukup.
   */
  async createOrder(
    data: CreateMerchantOrderInput,
    customerId: number,
    db: D1Database,
  ): Promise<{ order_id: number; order_number: string }> {
    const orderRepo   = new MerchantOrderRepository(db);
    const productRepo = new MerchantProductRepository(db);
    const merchantRepo = new MerchantRepository(db);

    // Validasi merchant APPROVED
    const merchant = await merchantRepo.findById(data.merchant_id);
    if (!merchant) throw new Error('Merchant tidak ditemukan');
    if (merchant.status !== 'APPROVED') {
      throw new Error('Merchant belum disetujui dan tidak menerima pesanan saat ini');
    }

    // Validasi setiap item: produk ada, available, stok cukup
    let subtotal = 0;
    const resolvedItems: Array<{
      product_id: number;
      quantity: number;
      unit_price: number;
      total_price: number;
    }> = [];

    for (const item of data.items) {
      const product = await productRepo.findById(item.product_id);
      if (!product) {
        throw new Error(`Produk ID ${item.product_id} tidak ditemukan`);
      }
      if (!product.is_available) {
        throw new Error(`Produk '${product.name}' sedang tidak tersedia`);
      }
      if (product.merchant_id !== data.merchant_id) {
        throw new Error(`Produk '${product.name}' bukan milik merchant ini`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Stok produk '${product.name}' tidak mencukupi (stok: ${product.stock})`);
      }

      const totalPrice = product.price * item.quantity;
      subtotal += totalPrice;

      resolvedItems.push({
        product_id:  item.product_id,
        quantity:    item.quantity,
        unit_price:  product.price,
        total_price: totalPrice,
      });
    }

    const deliveryFee  = data.delivery_fee;
    const totalAmount  = subtotal + deliveryFee;

    const orderId = await orderRepo.create(
      {
        customer_id:  customerId,
        merchant_id:  data.merchant_id,
        branch_id:    data.branch_id,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        notes:        data.notes,
      },
      resolvedItems,
    );

    const order = await orderRepo.findById(orderId);

    await createAuditLog(db, {
      user_id:     customerId,
      action:      AUDIT_ACTION.CREATE,
      entity_type: ENTITY_TYPE.MERCHANT_ORDER,
      entity_id:   orderId,
      metadata:    {
        order_number: order?.order_number,
        merchant_id:  data.merchant_id,
        total_amount: totalAmount,
        item_count:   resolvedItems.length,
      },
    });

    return { order_id: orderId, order_number: order!.order_number };
  }

  /**
   * Update status order.
   * Validasi transisi berdasarkan role aktor.
   */
  async updateOrderStatus(
    orderId: number,
    data: UpdateMerchantOrderStatusInput,
    actorId: number,
    actorRole: string,
    db: D1Database,
  ): Promise<void> {
    const orderRepo = new MerchantOrderRepository(db);
    const order = await orderRepo.findById(orderId);
    if (!order) throw new Error('Order tidak ditemukan');

    const currentStatus = order.status;
    const newStatus     = data.status;

    // Tentukan allowed transitions berdasarkan role
    let allowedNext: string[] | undefined;

    if (actorRole === 'super_admin' || actorRole === 'admin' || actorRole === 'operator') {
      allowedNext = ADMIN_TRANSITIONS[currentStatus];
    } else if (actorRole === 'driver') {
      allowedNext = DRIVER_TRANSITIONS[currentStatus];
    } else {
      // merchant (customer dengan merchant) — pakai MERCHANT_TRANSITIONS
      allowedNext = MERCHANT_TRANSITIONS[currentStatus];
    }

    if (!allowedNext || !allowedNext.includes(newStatus)) {
      throw new Error(
        `Tidak dapat mengubah status dari '${currentStatus}' ke '${newStatus}' dengan role '${actorRole}'`,
      );
    }

    await orderRepo.updateStatus(orderId, newStatus);

    if (newStatus === 'DELIVERED') {
      await PaymentService.completeMerchantSettlement(orderId, db);
    }

    await createAuditLog(db, {
      user_id:     actorId,
      action:      AUDIT_ACTION.UPDATE_STATUS,
      entity_type: ENTITY_TYPE.MERCHANT_ORDER,
      entity_id:   orderId,
      metadata:    { from: currentStatus, to: newStatus, actor_role: actorRole },
    });
  }

  /**
   * Ambil detail order beserta items.
   */
  async getOrderById(orderId: number, db: D1Database) {
    const orderRepo = new MerchantOrderRepository(db);
    const order = await orderRepo.findById(orderId);
    if (!order) throw new Error('Order tidak ditemukan');
    return order;
  }

  /**
   * List order dengan filter role-aware.
   */
  async listOrders(
    query: MerchantOrderQueryInput,
    actorId: number,
    actorRole: string,
    actorMerchantId: number | null,
    db: D1Database,
  ) {
    const orderRepo = new MerchantOrderRepository(db);

    let merchantId = query.merchant_id;
    let customerId = query.customer_id;
    let driverId   = query.driver_id;

    // Role-based filter enforcement
    if (actorRole === 'customer') {
      customerId = actorId; // customer hanya lihat order mereka sendiri
    } else if (actorRole === 'driver') {
      driverId = actorId; // driver hanya lihat order yang ditugaskan
    } else if (actorRole !== 'super_admin' && actorRole !== 'admin' && actorRole !== 'operator') {
      // Merchant — hanya lihat order merchant mereka
      if (actorMerchantId) merchantId = actorMerchantId;
    }

    return orderRepo.list(
      query.page,
      query.limit,
      merchantId,
      customerId,
      driverId,
      query.status,
    );
  }
}
