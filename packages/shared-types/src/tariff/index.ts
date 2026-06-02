export interface Tariff {
  id: number;
  service_type: 'MOTOR' | 'BENTOR' | 'PELAJAR';
  base_distance: number;
  base_price: number;
  additional_price_per_km: number;
  active_status: number;
  effective_date: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface TariffAdjustment {
  id: number;
  adjustment_name: string;
  adjustment_type: 'student_discount' | 'damaged_road' | 'uphill_road' | 'remote_area' | 'night_fee' | 'weather_fee';
  adjustment_mode: 'percentage' | 'flat';
  adjustment_value: number;
  active_status: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}
