import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { WorkshopDetailView } from "@/features/registrations/components/workshop-detail-view";

export const metadata = {
  title: "Workshop Details & Registrations | Workshop Manager",
  description: "View workshop schedule, seat availability, and manage attendee registrations",
};

export default async function WorkshopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const role = session?.user?.role;

  // Manager and staff only; admin -> /access-denied
  if (!can("view_workshops", role)) {
    redirect("/access-denied");
  }

  const { id } = await params;

  return (
    <div className="space-y-6">
      <WorkshopDetailView workshopId={id} />
    </div>
  );
}
