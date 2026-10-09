"use client";

import * as React from "react";
import { Button } from "@/components/core/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, FilterX, Layers, Activity } from "lucide-react";
import { auditActionLabels } from "@/lib/messages";
import type { AuditLogFilterState } from "../types";

export interface AuditLogsTableFiltersProps {
  filters: AuditLogFilterState;
  onFilterChange: (newFilters: Partial<AuditLogFilterState>) => void;
  onReset: () => void;
}

export function AuditLogsTableFilters({
  filters,
  onFilterChange,
  onReset,
}: AuditLogsTableFiltersProps) {
  const hasActiveFilters = Boolean(
    filters.entity_type || filters.action || filters.from || filters.to
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

      {/* Entity Type Filter */}
      <Select
        value={filters.entity_type ?? "all"}
        onValueChange={(val) =>
          onFilterChange({
            entity_type: !val || val === "all" ? undefined : (val as "user" | "workshop"),
          })
        }
      >
        <SelectTrigger className="w-[130px] h-8 text-xs gap-1.5">
          <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Entity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Entities</SelectItem>
          <SelectItem value="workshop">Workshops</SelectItem>
          <SelectItem value="user">Users</SelectItem>
        </SelectContent>
      </Select>

      {/* Action Filter */}
      <Select
        value={filters.action ?? "all"}
        onValueChange={(val) =>
          onFilterChange({ action: !val || val === "all" ? undefined : val })
        }
      >
        <SelectTrigger className="w-[160px] h-8 text-xs gap-1.5">
          <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Actions</SelectItem>
          {Object.entries(auditActionLabels).map(([actionKey, label]) => (
            <SelectItem key={actionKey} value={actionKey}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
  );
}
