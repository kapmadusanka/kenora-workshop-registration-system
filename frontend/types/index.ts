export type Role = "admin" | "manager" | "staff";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at?: string | null;
  created_by?: { id: number; name: string } | null;
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
  code?: string;
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

export type RegistrationStatus = "active" | "cancelled";

export interface Registration {
  id: number;
  workshop_id: number;
  attendee_name: string;
  attendee_email: string;
  status: RegistrationStatus;
  registered_by?: { id: number; name: string } | null;
  registered_at?: string | null;
  cancelled_by?: { id: number; name: string } | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
}

export interface RegistrationMutationResponse {
  data: Registration;
  workshop: {
    id: number;
    capacity: number;
    active_count: number;
    seats_left: number;
    is_full: boolean;
  };
}

export interface RegistrationsMetaCounts {
  active: number;
  cancelled: number;
  total: number;
}

export interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  user: { id: number; name: string } | null;
  created_at: string | null;
}

export interface Paginated<T> {
  data: T[];
  links?: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    links?: Array<{
      url: string | null;
      label: string;
      page?: number | null;
      active: boolean;
    }>;
    path?: string;
    per_page: number;
    to: number | null;
    total: number;
    counts?: RegistrationsMetaCounts;
  };
}
