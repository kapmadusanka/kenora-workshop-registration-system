import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { CreateWorkshopView } from "@/features/admin/workshops/components/create-workshop-view";

export const metadata = {
  title: "New Workshop | Kenora",
  description: "Schedule a new training workshop and configure seat capacity",
};

export default async function NewWorkshopPage() {
  const session = await auth();

  if (!can("edit_workshops", session?.user?.role)) {
    redirect("/access-denied");
  }

  return <CreateWorkshopView />;
}
