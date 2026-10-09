import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WorkshopListTable } from "@/features/admin/workshops/components/workshops-list-table";

export const instant = false;

export const metadata = {
  title: "Workshops | Workshop Manager",
  description: "Workshops management",
};

export default async function WorkshopsPage() {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    redirect("/access-denied");
  }

  return (
    <div className="space-y-6">
      <WorkshopListTable/>

    </div>
  );
}
