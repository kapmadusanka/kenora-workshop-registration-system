import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { WorkshopListTable } from "@/features/admin/workshops/components/workshops-list-table";

export const metadata = {
  title: "Workshops | Workshop Manager",
  description: "Browse upcoming workshops, schedules, and seat availability",
};

export default async function WorkshopsPage() {
  const session = await auth();
  const role = session?.user?.role;

  // Manager and staff permitted; admin -> /access-denied
  if (!can("view_workshops", role)) {
    redirect("/access-denied");
  }

  return (
    <div className="space-y-6">
      <WorkshopListTable />
    </div>
  );
}
