export interface Province {
  id: number;
  province_code: string;
  province_name: string;
  status: number; // SQLite integer boolean
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface Regency {
  id: number;
  province_id: number;
  regency_code: string;
  regency_name: string;
  status: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface District {
  id: number;
  regency_id: number;
  district_code: string;
  district_name: string;
  status: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface Village {
  id: number;
  district_id: number;
  village_code: string;
  village_name: string;
  latitude: number;
  longitude: number;
  is_active_service_area: number;
  status: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface Hamlet {
  id: number;
  village_id: number;
  hamlet_code: string;
  hamlet_name: string;
  latitude?: number;
  longitude?: number;
  status: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface CustomerAddress {
  id: number;
  customer_id: number;
  address_label: string;
  address_text: string;
  latitude: number;
  longitude: number;
  village_id: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface CustomerFavorite {
  id: number;
  customer_id: number;
  label: string;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface Zone {
  id: number;
  zone_code: string;
  zone_name: string;
  zone_type: 'CORE' | 'RURAL' | 'REMOTE';
  description?: string;
  status: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface ServiceArea {
  id: number;
  village_id: number;
  zone_id?: number;
  coverage_type: 'full' | 'pickup_only' | 'dropoff_only' | 'none';
  status: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface Road {
  id: number;
  road_name: string;
  village_id: number;
  road_type: 'asphalt' | 'concrete' | 'gravel' | 'dirt';
  road_condition: 'good' | 'fair' | 'damaged' | 'severe';
  difficulty_level: 'normal' | 'uphill' | 'steep' | 'extreme';
  status: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface PointOfInterest {
  id: number;
  poi_code: string;
  poi_name: string;
  poi_type: 'PASAR' | 'MASJID' | 'MUSHOLA' | 'BALAI_DESA' | 'PUSKESMAS' | 'KLINIK' | 'SEKOLAH' | 'PONDOK' | 'TERMINAL' | 'KANTOR_DESA' | 'KANTOR_KECAMATAN' | 'SPBU' | 'MINIMARKET';
  address: string;
  village_id: number;
  latitude: number;
  longitude: number;
  status: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}
