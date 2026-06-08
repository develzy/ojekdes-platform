export interface Role {
  id: number;
  role_name: 'super_admin' | 'admin' | 'operator' | 'customer' | 'driver';
  description?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface Permission {
  id: number;
  permission_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface RolePermission {
  id: number;
  role_id: number;
  permission_id: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface User {
  id: number;
  phone: string;
  email?: string;
  password_hash: string;
  role_id: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface UserProfile {
  id: number;
  user_id: number;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface Session {
  id: number;
  user_id: number;
  refresh_token_hash: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface RefreshToken {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  is_revoked: number; // SQLite 0 or 1
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: number;
  updated_by?: number;
}
