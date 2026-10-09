export type Role = "admin" | "manager" | "staff";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
}

export interface LoginResponse {
  token: string;
  token_type: string;
  expires_at: string;
  user: User;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}
