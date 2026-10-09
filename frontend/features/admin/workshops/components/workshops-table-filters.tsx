"use client";

import * as React from "react";
import { Button } from "@/components/core/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, FilterX, Users, X } from "lucide-react";
import { getThisWeekDateRange, getTodayDateString } from "@/lib/format";

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
  // Preset: "This Week" (Monday to Sunday in local time)
  const setThisWeekPreset = () => {
    const range = getThisWeekDateRange();
    onFilterChange({
      from: range.from,
      to: range.to,
    });
  };

  // Preset: "Today" in local time
  const setTodayPreset = () => {
    const today = getTodayDateString();
    onFilterChange({
      from: today,
      to: today,
    });
  };

  // Preset: "Has seats"
  const toggleHasSeatsPreset = () => {
    onFilterChange({
      has_seats: filters.has_seats === "true" ? undefined : "true",
    });
  };

  const hasActiveFilters = Boolean(
    filters.from || filters.to || filters.has_seats || filters.status
  );

  return (
    <div className="flex flex-col gap-2.5">
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

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setThisWeekPreset}
            className="h-8 text-xs px-2.5 font-medium"
          >
            This Week
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setTodayPreset}
            className="h-8 text-xs px-2.5 font-medium"
          >
            Today
          </Button>

          <Button
            type="button"
            variant={filters.has_seats === "true" ? "primary" : "outline"}
            size="sm"
            onClick={toggleHasSeatsPreset}
            className="h-8 text-xs px-2.5 font-medium gap-1"
          >
            <Users className="h-3 w-3" />
            <span>Has Seats</span>
          </Button>

          {/* Clear Filters */}
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
              <span>Clear filters</span>
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Removable Chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[11px] font-semibold text-muted-foreground mr-0.5">
            Active filters:
          </span>

          {filters.from && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted border border-border/70 text-foreground">
              <span>From: {filters.from}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ from: undefined })}
                className="hover:text-destructive cursor-pointer"
                aria-label="Remove From filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.to && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted border border-border/70 text-foreground">
              <span>To: {filters.to}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ to: undefined })}
                className="hover:text-destructive cursor-pointer"
                aria-label="Remove To filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.status && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted border border-border/70 text-foreground capitalize">
              <span>Status: {filters.status}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ status: undefined })}
                className="hover:text-destructive cursor-pointer"
                aria-label="Remove Status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.has_seats === "true" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted border border-border/70 text-foreground">
              <span>Has seats available</span>
              <button
                type="button"
                onClick={() => onFilterChange({ has_seats: undefined })}
                className="hover:text-destructive cursor-pointer"
                aria-label="Remove Has Seats filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
