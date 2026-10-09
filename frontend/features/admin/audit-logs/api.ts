import { apiClient } from "@/lib/api-client";
import type { AuditLog, AuditLogFilterState } from "./types";
import type { Paginated } from "@/types";

export async function getAuditLogs(
  params: AuditLogFilterState & { page?: number; per_page?: number } = {}
): Promise<Paginated<AuditLog>> {
  const response = await apiClient.get<Paginated<AuditLog>>("/audit-logs", {
    params,
  });
  return response.data;
}
