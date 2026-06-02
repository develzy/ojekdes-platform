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
