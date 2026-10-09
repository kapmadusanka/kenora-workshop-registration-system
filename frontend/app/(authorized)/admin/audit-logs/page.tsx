import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { AuditLogsTable } from "@/features/admin/audit-logs/components/audit-logs-table";

export const metadata = {
  title: "Audit Log | Workshop Manager",
  description: "View system audit trail and configuration changes",
};

export default async function AdminAuditLogsPage() {
  const session = await auth();
  const role = session?.user?.role;

  // Admin only: manager/staff -> /access-denied
  if (!can("audit.view", role)) {
    redirect("/access-denied");
  }

  return (
    <div className="space-y-6">
      <AuditLogsTable />
    </div>
  );
}
