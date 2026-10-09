import * as React from "react";
import { cn } from "@/lib/utils";

export interface SeatsBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  seatsLeft?: number | null;
  capacity: number;
  isFull?: boolean;
}

export function SeatsBadge({
  seatsLeft,
  capacity,
  isFull,
  className,
  ...props
}: SeatsBadgeProps) {
  const full = isFull ?? (seatsLeft !== undefined && seatsLeft !== null ? seatsLeft <= 0 : false);
  const displaySeatsLeft = seatsLeft !== undefined && seatsLeft !== null ? Math.max(0, seatsLeft) : "—";

  return (
    <div className={cn("inline-flex items-center gap-2", className)} {...props}>
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums border",
          full
            ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
            : "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
        )}
      >
        {displaySeatsLeft} / {capacity} seats left
      </span>
      {full && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-rose-600 text-white shadow-xs">
          Full
        </span>
      )}
    </div>
  );
}
