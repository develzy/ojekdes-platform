export interface Driver {
  id: number;
  user_id: number;
  license_number: string;
  rating: number;
  status: 'OFFLINE' | 'ONLINE' | 'BUSY' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface DriverDocument {
  id: number;
  driver_id: number;
  document_type: 'KTP' | 'SIM' | 'STNK' | 'SKCK';
  document_url: string;
  verified_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  verified_at?: string;
  verified_by?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface DriverStatusLog {
  id: number;
  driver_id: number;
  previous_status: string;
  new_status: string;
  reason?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}
