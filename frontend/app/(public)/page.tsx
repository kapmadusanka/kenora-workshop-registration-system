import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { homePathFor } from "@/lib/permissions";

export const instant = false;

export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  redirect(homePathFor(session.user.role));
}
