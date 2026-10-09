import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { UsersListTable } from "@/features/admin/users/components/users-list-table";

export const metadata = {
  title: "User Management | Workshop Manager",
  description: "User and role management for administrators",
};

export default async function AdminUsersPage() {
  const session = await auth();
  const role = session?.user?.role;

  // Admin only: manager/staff -> /access-denied
  if (!can("create_users", role)) {
    redirect("/access-denied");
  }

  return (
    <div className="space-y-6">
      <UsersListTable />
    </div>
  );
}
