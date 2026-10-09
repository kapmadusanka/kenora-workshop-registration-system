"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { useFormCrudManager } from "@/hooks/use-form-crud";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/shared/data-table/data-table";
import { OpType } from "@/constants/common";
import { EditIcon, EyeIcon, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/core/Button";
import { StatusBadge } from "@/components/core/StatusBadge";
import { formatDateRange, formatDateTimeLocal } from "@/lib/format";
import { Workshop } from "@/features/admin/workshops/types/workshops-types";
import { WorkshopFormContainer } from "@/features/admin/workshops/components/workshops-form-container";
import {
  WorkshopTableFilters,
  WorkshopFilterState,
} from "@/features/admin/workshops/components/workshops-table-filters";

export function WorkshopListTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial filters from URL query string
  const [filters, setFilters] = React.useState<WorkshopFilterState>(() => ({
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    has_seats: searchParams.get("has_seats") || undefined,
    status: searchParams.get("status") || undefined,
  }));

  // Keep URL query string synced with filters
  const updateUrlFilters = React.useCallback(
    (newFilters: WorkshopFilterState) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newFilters.from) params.set("from", newFilters.from);
      else params.delete("from");

      if (newFilters.to) params.set("to", newFilters.to);
      else params.delete("to");

      if (newFilters.has_seats) params.set("has_seats", newFilters.has_seats);
      else params.delete("has_seats");

      if (newFilters.status) params.set("status", newFilters.status);
      else params.delete("status");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const handleFilterChange = (partial: Partial<WorkshopFilterState>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...partial };
      updateUrlFilters(updated);
      return updated;
    });
  };

  const handleResetFilters = () => {
    const emptyFilters = {
      from: undefined,
      to: undefined,
      has_seats: undefined,
      status: undefined,
    };
    setFilters(emptyFilters);
    updateUrlFilters(emptyFilters);
  };

  const columns: ColumnDef<Workshop>[] = [
    {
      accessorKey: "code",
      header: "Code",
      minSize: 110,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-foreground">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      minSize: 350,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground leading-snug">
            {row.original.title}
          </span>
          {row.original.description && (
            <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {row.original.description}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "instructor",
      header: "Instructor",
      minSize: 130,
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {row.original.instructor}
        </span>
      ),
    },
    {
      accessorKey: "starts_at",
      header: "Schedule",
      minSize: 180,
      cell: ({ row }) => (
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          {formatDateRange(row.original.starts_at, row.original.ends_at)}
        </span>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      minSize: 120,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.location || "—"}
        </span>
      ),
    },
    {
      accessorKey: "seats_left",
      header: "Seats Available",
      minSize: 130,
      cell: ({ row }) => {
        const capacity = row.original.capacity;
        const seatsLeft =
          row.original.seats_left ??
          Math.max(0, capacity - (row.original.active_count ?? 0));
        const isFull = row.original.is_full ?? seatsLeft === 0;

        return (
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold text-sm ${
                isFull ? "text-rose-600 font-bold" : "text-emerald-700"
              }`}
            >
              {seatsLeft} / {capacity}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      minSize: 120,
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          isFull={row.original.is_full}
        />
      ),
    },
  ];

  const crud = useFormCrudManager<Workshop>({
    endpoint: {
      create: "/workshops",
      common: "/workshops",
      edit: "/workshops",
    },
    updateMethod: "patch",
    queryKey: "workshops",
    extraInvalidationKeys: [["workshops-list"]],
    transformInitialData: (data: Workshop) => ({
      ...data,
      starts_at: formatDateTimeLocal(data.starts_at),
      ends_at: formatDateTimeLocal(data.ends_at),
    }),
  });

  const {
    globalFilter,
    setGlobalFilter,
    data,
    pagination,
    isLoading,
    setPagination,
    totalRecords,
    sorting,
    setSorting,
  } = useDataTable<Workshop>({
    endpoint: "/workshops",
    queryKey: ["workshops-list"],
    defaultSort: {
      column: "starts_at",
      direction: "asc",
    },
    extraParams: {
      from: filters.from,
      to: filters.to,
      has_seats: filters.has_seats,
      status: filters.status,
    },
  });

  return (
    <>
      <PageHeader
        title="Workshops"
        subtitle="Manage upcoming workshops, seat capacity, and schedules"
        actions={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => crud.onAddNew()}
              variant="primary"
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Workshop</span>
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        emptyDataMessage={
          globalFilter || filters.from || filters.to || filters.has_seats || filters.status
            ? {
                title: "No workshops match your filters",
                description: "Try adjusting or resetting your search and filter criteria.",
              }
            : {
                title: "No workshops have been created yet",
                description: "Click 'Add Workshop' to schedule your first workshop.",
              }
        }
        pageSize={15}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        loading={isLoading}
        searchKeys="by code, title or instructor"
        totalRecords={totalRecords ?? 0}
        pagination={pagination}
        setPagination={setPagination}
        sorting={sorting}
        setSorting={setSorting}
        renderCustomFilter={() => (
          <WorkshopTableFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />
        )}
        onRowAction={crud.onRowAction}
        rowActions={[
          {
            label: "View",
            action: OpType.View,
            icon: <EyeIcon size={15} />,
          },
          {
            label: "Edit",
            action: OpType.Edit,
            icon: <EditIcon size={15} />,
          },
        ]}
      />

      <WorkshopFormContainer crud={crud} />
    </>
  );
}
