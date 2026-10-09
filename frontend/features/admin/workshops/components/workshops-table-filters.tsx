"use client";

import * as React from "react";
import { Button } from "@/components/core/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, FilterX, Users } from "lucide-react";

export interface WorkshopFilterState {
  from?: string;
  to?: string;
  has_seats?: string;
  status?: string;
}

interface WorkshopTableFiltersProps {
  filters: WorkshopFilterState;
  onFilterChange: (newFilters: Partial<WorkshopFilterState>) => void;
  onReset: () => void;
}

export function WorkshopTableFilters({
  filters,
  onFilterChange,
  onReset,
}: WorkshopTableFiltersProps) {
  // Preset: "This Week" (today to 7 days from now in YYYY-MM-DD)
  const setThisWeekPreset = () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const formatYMD = (d: Date) => d.toISOString().split("T")[0];

    onFilterChange({
      from: formatYMD(today),
      to: formatYMD(nextWeek),
    });
  };

  const hasActiveFilters = Boolean(
    filters.from || filters.to || filters.has_seats || filters.status
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date Range: From */}
      <div className="flex items-center gap-1.5 bg-muted/30 border border-border/60 rounded-md px-2.5 py-1 text-xs">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground font-medium">From:</span>
        <input
          type="date"
          value={filters.from ?? ""}
          onChange={(e) => onFilterChange({ from: e.target.value || undefined })}
          className="bg-transparent border-none text-xs focus:outline-hidden text-foreground cursor-pointer"
        />
      </div>

      {/* Date Range: To */}
      <div className="flex items-center gap-1.5 bg-muted/30 border border-border/60 rounded-md px-2.5 py-1 text-xs">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground font-medium">To:</span>
        <input
          type="date"
          value={filters.to ?? ""}
          onChange={(e) => onFilterChange({ to: e.target.value || undefined })}
          className="bg-transparent border-none text-xs focus:outline-hidden text-foreground cursor-pointer"
        />
      </div>

      {/* Status Filter */}
      <Select
        value={filters.status ?? "all"}
        onValueChange={(val) =>
          onFilterChange({ status: !val || val === "all" ? undefined : val })
        }
      >
        <SelectTrigger className="w-[125px] h-8 text-xs gap-1.5">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>

      {/* Seats Filter */}
      <Select
        value={filters.has_seats ?? "all"}
        onValueChange={(val) =>
          onFilterChange({ has_seats: !val || val === "all" ? undefined : val })
        }
      >
        <SelectTrigger className="w-[130px] h-8 text-xs gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Seats" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Capacities</SelectItem>
          <SelectItem value="true">Has Seats Left</SelectItem>
        </SelectContent>
      </Select>

      {/* Quick Preset: This Week */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={setThisWeekPreset}
        className="h-8 text-xs px-2.5 font-medium"
      >
        This Week
      </Button>

      {/* Reset Filters */}
      {hasActiveFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground flex items-center gap-1"
          title="Clear all filters"
        >
          <FilterX className="h-3.5 w-3.5" />
          <span>Reset</span>
        </Button>
      )}
    </div>
  );
}
