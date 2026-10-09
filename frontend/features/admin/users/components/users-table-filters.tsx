"use client";

import * as React from "react";
import { Button } from "@/components/core/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterX, ShieldCheck, UserCheck } from "lucide-react";
import type { UserFilterState } from "../types";

export interface UsersTableFiltersProps {
  filters: UserFilterState;
  onFilterChange: (newFilters: Partial<UserFilterState>) => void;
  onReset: () => void;
}

export function UsersTableFilters({
  filters,
  onFilterChange,
  onReset,
}: UsersTableFiltersProps) {
  const hasActiveFilters = Boolean(filters.role || filters.is_active);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Role Filter */}
      <Select
        value={filters.role ?? "all"}
        onValueChange={(val) =>
          onFilterChange({ role: !val || val === "all" ? undefined : val })
        }
      >
        <SelectTrigger className="w-[130px] h-8 text-xs gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="manager">Manager</SelectItem>
          <SelectItem value="staff">Staff</SelectItem>
        </SelectContent>
      </Select>

      {/* Active Status Filter */}
      <Select
        value={filters.is_active ?? "all"}
        onValueChange={(val) =>
          onFilterChange({ is_active: !val || val === "all" ? undefined : val })
        }
      >
        <SelectTrigger className="w-[140px] h-8 text-xs gap-1.5">
          <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="true">Active Only</SelectItem>
          <SelectItem value="false">Inactive Only</SelectItem>
        </SelectContent>
      </Select>

      {/* Reset Button */}
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
