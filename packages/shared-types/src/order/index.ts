// ─── Order Status Types ───────────────────────────────────────────────────────
// Self-contained — tidak import dari package lain

export type OrderStatus        = 'SEARCHING_DRIVER' | 'DRIVER_ASSIGNED' | 'DRIVER_ARRIVED' | 'ON_TRIP' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
export type OrderServiceType   = 'RIDE' | 'COURIER' | 'MERCHANT';
export type OrderPaymentMethod = 'CASH' | 'WALLET' | 'MIDTRANS';
export type OrderPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type AssignmentStatus   = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type OrderProofType     = 'PICKUP' | 'DELIVERY';

// ─── Order ────────────────────────────────────────────────────────────────────

export interface Order {
  id: number;
  order_number: string;

  customer_id: number;
  driver_id: number | null;
  merchant_id: number | null;
  merchant_order_id: number | null;

  service_type: OrderServiceType;

  pickup_name: string | null;
  pickup_phone: string | null;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;

  destination_name: string | null;
  destination_phone: string | null;
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;

  distance_km: number;
  duration_minutes: number;

  estimated_price: number;
  final_price: number;

  payment_method: OrderPaymentMethod;
  payment_status: OrderPaymentStatus;

  status: OrderStatus;
  notes: string | null;

  created_at: string;
  updated_at: string;
}

// ─── Order Tracking ───────────────────────────────────────────────────────────

export interface OrderTracking {
  id: number;
  order_id: number;
  driver_id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
}

// ─── Order Status History ─────────────────────────────────────────────────────

export interface OrderStatusHistory {
  id: number;
  order_id: number;
  old_status: string | null;
  new_status: string;
  changed_by: number | null;
  notes: string | null;
  created_at: string;
}

// ─── Driver Assignment ────────────────────────────────────────────────────────

export interface DriverAssignment {
  id: number;
  order_id: number;
  driver_id: number;
  assignment_status: AssignmentStatus;
  assigned_at: string;
  responded_at: string | null;
}

// ─── Order Cancellation ───────────────────────────────────────────────────────

export interface OrderCancellation {
  id: number;
  order_id: number;
  cancelled_by: number;
  reason: string;
  refund_amount: number;
  created_at: string;
}

// ─── Order Rating ─────────────────────────────────────────────────────────────

export interface OrderRating {
  id: number;
  order_id: number;
  customer_id: number;
  driver_id: number;
  rating: number;
  review: string | null;
  created_at: string;
}

// ─── Order Proof ──────────────────────────────────────────────────────────────

export interface OrderProof {
  id: number;
  order_id: number;
  proof_type: OrderProofType;
  image_url: string;
  uploaded_by: number;
  created_at: string;
}

// ─── Composite Types ──────────────────────────────────────────────────────────

export interface OrderDetail extends Order {
  status_history: OrderStatusHistory[];
  tracking: OrderTracking[];
  assignment: DriverAssignment | null;
  cancellation: OrderCancellation | null;
  rating: OrderRating | null;
  proofs: OrderProof[];
}
