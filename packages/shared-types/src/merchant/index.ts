// ─── Merchant Status Types ────────────────────────────────────────────────────
// Didefinisikan langsung di sini agar shared-types tetap self-contained
// (tidak bergantung ke package lain).

export type MerchantStatus         = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type MerchantOrderStatus    = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
export type MerchantDocumentType   = 'KTP' | 'NPWP' | 'NIB' | 'SIUP' | 'FOTO_TOKO';

// ─── Merchant Business Category ───────────────────────────────────────────────

export interface MerchantCategory {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// ─── Merchant Product Category ────────────────────────────────────────────────

export interface MerchantProductCategory {
  id: number;
  merchant_category_id: number | null;
  code: string;
  name: string;
  icon: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// ─── Merchant ─────────────────────────────────────────────────────────────────

export interface Merchant {
  id: number;
  user_id: number;
  category_id: number;
  merchant_code: string;
  business_name: string;
  owner_name: string;
  phone: string;
  email: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  status: MerchantStatus;
  verified_at: string | null;
  verified_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MerchantWithCategory extends Merchant {
  category_name: string;
  category_code: string;
  category_icon: string | null;
}

// ─── Merchant Document ────────────────────────────────────────────────────────

export interface MerchantDocument {
  id: number;
  merchant_id: number;
  document_type: MerchantDocumentType;
  document_url: string;
  is_verified: number;
  verified_at: string | null;
  verified_by: number | null;
  created_at: string;
}

// ─── Merchant Bank Account ────────────────────────────────────────────────────

export interface MerchantBankAccount {
  id: number;
  merchant_id: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_primary: number;
  created_at: string;
}

// ─── Merchant Branch ──────────────────────────────────────────────────────────

export interface MerchantBranch {
  id: number;
  merchant_id: number;
  village_id: number | null;
  hamlet_id: number | null;
  branch_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  is_main_branch: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// ─── Merchant Operating Hours ─────────────────────────────────────────────────

export interface MerchantOperatingHours {
  id: number;
  branch_id: number;
  day_of_week: number; // 0=Minggu ... 6=Sabtu
  open_time: string;   // HH:MM
  close_time: string;  // HH:MM
  is_open: number;
}

// ─── Merchant Product ─────────────────────────────────────────────────────────

export interface MerchantProduct {
  id: number;
  merchant_id: number;
  category_id: number;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price: number;     // IDR integer
  stock: number;
  weight: number;    // grams
  is_available: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MerchantProductWithCategory extends MerchantProduct {
  category_name: string;
  category_code: string;
}

export interface MerchantProductImage {
  id: number;
  product_id: number;
  image_url: string;
  sort_order: number;
}

// ─── Merchant Order ───────────────────────────────────────────────────────────

export interface MerchantOrder {
  id: number;
  order_number: string;
  customer_id: number;
  merchant_id: number;
  branch_id: number | null;
  driver_id: number | null;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  status: MerchantOrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MerchantOrderItem {
  id: number;
  merchant_order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface MerchantOrderWithItems extends MerchantOrder {
  items: MerchantOrderItem[];
}
