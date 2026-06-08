export interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  hold_balance: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: number;
  wallet_id: number;
  reference_type: 'ORDER' | 'TOPUP' | 'WITHDRAW' | 'SETTLEMENT' | 'BONUS' | 'REFUND';
  reference_id?: number | null;
  transaction_type: 'CREDIT' | 'DEBIT';
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string | null;
  created_at: string;
}

export interface PaymentTransaction {
  id: number;
  order_id?: number | null;
  merchant_order_id?: number | null;
  payment_code: string;
  midtrans_transaction_id?: string | null;
  payment_method: 'CASH' | 'WALLET' | 'QRIS' | 'BANK_TRANSFER' | 'GOPAY' | 'SHOPEEPAY';
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
  snap_token?: string | null;
  redirect_url?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settlement {
  id: number;
  driver_id: number;
  order_id: number;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  status: 'PENDING' | 'SETTLED' | 'FAILED';
  settled_at?: string | null;
  created_at: string;
}

export interface MerchantSettlement {
  id: number;
  merchant_id: number;
  merchant_order_id: number;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  status: 'PENDING' | 'SETTLED' | 'FAILED';
  settled_at?: string | null;
  created_at: string;
  created_by_payment_id?: number | null;
}

export interface PayoutRequest {
  id: number;
  user_id: number;
  wallet_id: number;
  amount: number;
  bank_account_id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  requested_at: string;
  processed_at?: string | null;
  processed_by?: number | null;
}

export interface RefundTransaction {
  id: number;
  payment_id: number;
  amount: number;
  reason?: string | null;
  created_at: string;
}
