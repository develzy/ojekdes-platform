import { DriverMatchStatus, DriverAction } from '@ojekdes/shared-constants';

export interface DriverSession {
  id: number;
  driver_id: number;
  is_online: number;
  current_latitude: number | null;
  current_longitude: number | null;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface DriverLocation {
  id: number;
  driver_id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
}

export interface DriverMatchingQueue {
  id: number;
  order_id: number;
  driver_id: number;
  priority: number;
  distance_km: number;
  status: DriverMatchStatus;
  sent_at: string | null;
  responded_at: string | null;
}

export interface DriverAssignmentHistory {
  id: number;
  order_id: number;
  driver_id: number;
  action: DriverAction;
  created_at: string;
}

export interface DriverAvailability {
  id: number;
  driver_id: number;
  is_available: number;
  current_order_id: number | null;
  updated_at: string;
}
