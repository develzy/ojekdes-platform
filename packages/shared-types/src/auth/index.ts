export interface LoginPayload {
  phone: string;
  password_hash: string;
}

export interface RegisterPayload {
  phone: string;
  email?: string;
  password_hash: string;
  role_id: number;
  full_name: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    phone: string;
    email?: string;
    role: string;
    profile: {
      full_name: string;
      avatar_url?: string;
    };
  };
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    phone: string;
    email?: string;
    role: 'super_admin' | 'admin' | 'operator' | 'customer' | 'driver';
    profile: {
      full_name: string;
      avatar_url?: string;
    };
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  sub: string;
  role: 'super_admin' | 'admin' | 'operator' | 'customer' | 'driver';
  sessionId: string;
}

