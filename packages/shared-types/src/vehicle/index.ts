export interface Vehicle {
  id: number;
  driver_id: number;
  plate_number: string;
  vehicle_type: 'MOTOR' | 'BENTOR';
  brand_model: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}
