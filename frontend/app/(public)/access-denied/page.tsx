import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { auth } from "@/auth";
import { homePathFor } from "@/lib/permissions";
import { buttonVariants } from "@/components/ui/button";
import { uiMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";

export const instant = false;

export const metadata = {
  title: "Access Denied | Workshop Manager",
  description: "You do not have access to this resource.",
};

export default async function AccessDeniedPage() {
  const session = await auth();
  const destination = session?.user ? homePathFor(session.user.role) : "/login";

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center flex flex-col items-center">
        <div className="h-14 w-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-5">
          <ShieldAlert className="size-8" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {uiMessages.accessDeniedTitle}
        </h1>

        <p className="text-sm text-slate-600 mt-2 mb-6">
          {uiMessages.accessDeniedMessage}
        </p>

        <Link
          href={destination}
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          {uiMessages.backToHome}
        </Link>
      </div>
    </div>
  );
}
