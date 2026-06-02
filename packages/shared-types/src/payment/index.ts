export interface Payment {
  id: number;
  order_id: number;
  payment_method: 'CASH' | 'QRIS';
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'EXPIRED';
  midtrans_payment_type?: string;
  midtrans_transaction_id?: string;
  midtrans_order_id?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface PaymentTransaction {
  id: number;
  payment_id: number;
  transaction_type: 'payment' | 'payout' | 'refund';
  amount: number;
  raw_payload?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface WalletTransaction {
  id: number;
  wallet_id: number;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  reference_type: 'ORDER' | 'TOPUP' | 'WITHDRAWAL' | 'SYSTEM';
  reference_id?: number;
  description?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}
