import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { auth } from "@/auth";
import { uiMessages } from "@/lib/messages";

export const instant = false;

export const metadata = {
  title: "Users Management | Workshop Manager",
  description: "User and role management for administrators",
};

export default async function AdminUsersPage() {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    redirect("/access-denied");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          User Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage system users and access roles across training centres.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center flex flex-col items-center justify-center min-h-[360px]">
        <div className="h-12 w-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
          <Users className="size-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          Coming Soon
        </h2>
        <p className="text-sm text-slate-500 max-w-sm mt-1">

        </p>
      </div>
    </div>
  );
}
