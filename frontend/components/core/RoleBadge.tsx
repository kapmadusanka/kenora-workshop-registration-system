import * as React from "react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

export interface RoleBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  role: Role;
}

const roleStyles: Record<Role, string> = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  manager: "bg-emerald-100 text-emerald-800 border-emerald-200",
  staff: "bg-blue-100 text-blue-800 border-blue-200",
};

export function RoleBadge({ role, className, ...props }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize border",
        roleStyles[role],
        className
      )}
      {...props}
    >
      {role}
    </span>
  );
}
