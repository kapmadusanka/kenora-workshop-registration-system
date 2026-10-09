import * as React from "react";
import { cn } from "@/lib/utils";

export type WorkshopStatusType = "open" | "draft" | "cancelled" | "completed";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: WorkshopStatusType | string;
  isFull?: boolean;
}

const statusStyles: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-800 border-emerald-200",
  draft: "bg-amber-100 text-amber-800 border-amber-200",
  cancelled: "bg-rose-100 text-rose-800 border-rose-200",
  completed: "bg-slate-100 text-slate-800 border-slate-200",
};

export function StatusBadge({ status, isFull, className, ...props }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const style = statusStyles[normalized] ?? "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border",
          style,
          className
        )}
        {...props}
      >
        {normalized}
      </span>
      {isFull && normalized === "open" && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          Full
        </span>
      )}
    </div>
  );
}
