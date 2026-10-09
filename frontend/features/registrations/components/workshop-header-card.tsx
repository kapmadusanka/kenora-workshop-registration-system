import * as React from "react";
import { StatusBadge } from "@/components/core/StatusBadge";
import { SeatsBadge } from "@/components/core/SeatsBadge";
import { formatDateRange } from "@/lib/format";
import type { Workshop } from "@/features/registrations/types";
import { MapPin, User, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/core/Button";

export interface WorkshopHeaderCardProps {
  workshop: Workshop;
  backHref?: string;
}

export function WorkshopHeaderCard({
  workshop,
  backHref = "/workshops",
}: WorkshopHeaderCardProps) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={backHref}>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl"
              aria-label="Back to workshops"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
                {workshop.code}
              </span>
              <StatusBadge status={workshop.status} isFull={workshop.is_full} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
              {workshop.title}
            </h1>
          </div>
        </div>

        <div>
          <SeatsBadge
            seatsLeft={workshop.seats_left}
            capacity={workshop.capacity}
            isFull={workshop.is_full}
          />
        </div>
      </div>

      {workshop.description && (
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
          {workshop.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-border/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <User className="h-4 w-4 text-primary" />
          <span>Instructor:</span>
          <span className="font-semibold text-foreground">{workshop.instructor}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-primary" />
          <span>Schedule:</span>
          <span className="font-semibold text-foreground">
            {formatDateRange(workshop.starts_at, workshop.ends_at)}
          </span>
        </div>

        {workshop.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Location:</span>
            <span className="font-semibold text-foreground">{workshop.location}</span>
          </div>
        )}
      </div>
    </div>
  );
}
