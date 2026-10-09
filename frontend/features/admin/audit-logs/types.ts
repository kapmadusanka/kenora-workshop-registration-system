import type { AuditLog } from "@/types";

export type { AuditLog };

export interface AuditLogFilterState {
  entity_type?: "user" | "workshop";
  action?: string;
  from?: string;
  to?: string;
}
