import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AdminWorkshopsRedirect() {
  const session = await auth();

  if (session?.user?.role === "admin") {
    redirect("/admin/users");
  }

  redirect("/workshops");
}
