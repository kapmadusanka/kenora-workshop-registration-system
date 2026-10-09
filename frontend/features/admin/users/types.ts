import type { User, Role } from "@/types";
import type {
  CreateUserFormData,
  UpdateUserFormData,
} from "@/lib/schemas/user-schema";

export type { User, Role, CreateUserFormData, UpdateUserFormData };

export interface UserFilterState {
  role?: string;
  is_active?: string;
  q?: string;
}
