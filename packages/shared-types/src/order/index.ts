export interface Order {
  id: number;
  order_code: string;
  customer_id: number;
  driver_id?: number;
  service_type: 'MOTOR' | 'BENTOR' | 'PELAJAR';
  status: 'PENDING' | 'SEARCHING_DRIVER' | 'DRIVER_ACCEPTED' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  distance: number;
  fare: number;
  platform_fee: number;
  net_fare: number;
  discount: number;
  surcharge: number;
  payment_method: 'CASH' | 'QRIS';
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface OrderLocation {
  id: number;
  order_id: number;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_village_id: number;
  dropoff_address: string;
  dropoff_latitude: number;
  dropoff_longitude: number;
  dropoff_village_id: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface OrderStatusLog {
  id: number;
  order_id: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface OrderCancellation {
  id: number;
  order_id: number;
  cancelled_by: number;
  reason_category: 'driver_not_moving' | 'client_cancelled' | 'change_mind' | 'wait_too_long' | 'other';
  reason_text?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}
