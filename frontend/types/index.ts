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

export type WorkshopStatus = "draft" | "open" | "cancelled" | "completed";

export interface Workshop {
  id: number;
  code: string;
  title: string;
  instructor: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  capacity: number;
  status: WorkshopStatus;
  active_count?: number;
  seats_left?: number;
  is_full?: boolean;
  created_by?: { id: number; name: string } | null;
  updated_by?: { id: number; name: string } | null;
  created_at?: string;
  updated_at?: string;
}

export interface Paginated<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    links: Array<{
      url: string | null;
      label: string;
      page?: number | null;
      active: boolean;
    }>;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}
