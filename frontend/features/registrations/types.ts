import type {
  Registration,
  RegistrationMutationResponse,
  Workshop,
  Paginated,
  RegistrationsMetaCounts,
} from "@/types";
import type { RegistrationFormData, CancelRegistrationFormData } from "@/lib/schemas/registration-schema";

export type {
  Registration,
  RegistrationMutationResponse,
  Workshop,
  Paginated,
  RegistrationsMetaCounts,
  RegistrationFormData,
  CancelRegistrationFormData,
};

export type RegistrationTab = "active" | "cancelled" | "all";

export interface RegistrationListFilters {
  status?: RegistrationTab;
  q?: string;
  page?: number;
  per_page?: number;
}
