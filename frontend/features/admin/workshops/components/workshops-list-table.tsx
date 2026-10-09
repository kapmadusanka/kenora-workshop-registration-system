"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/shared/data-table/data-table";
import { EditIcon, EyeIcon, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/core/Button";
import { StatusBadge } from "@/components/core/StatusBadge";
import { SeatsBadge } from "@/components/core/SeatsBadge";
import { formatDateRange } from "@/lib/format";
import { can } from "@/lib/permissions";
import { useSession } from "next-auth/react";
import { Workshop } from "@/features/admin/workshops/types/workshops-types";
import { WorkshopDialogForm } from "@/features/admin/workshops/components/workshop-dialog-form";
import {
  WorkshopTableFilters,
  WorkshopFilterState,
} from "@/features/admin/workshops/components/workshops-table-filters";

export function WorkshopListTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const canEdit = can("edit_workshops", session?.user?.role);

  const [formOpen, setFormOpen] = React.useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = React.useState<Workshop | null>(null);

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
      minSize: 420,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground leading-snug text-sm">
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
      minSize: 140,
      cell: ({ row }) => (
        <SeatsBadge
          seatsLeft={row.original.seats_left}
          capacity={row.original.capacity}
          isFull={row.original.is_full}
        />
      ),
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
    refetch,
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
          canEdit ? (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  setSelectedWorkshop(null);
                  setFormOpen(true);
                }}
                variant="primary"
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Workshop</span>
              </Button>
            </div>
          ) : undefined
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
        onRowClick={(row) => router.push(`/workshops/${row.id}`)}
        renderCustomFilter={() => (
          <WorkshopTableFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />
        )}
        rowActions={[
          {
            label: "View",
            action: "view",
            icon: <EyeIcon size={15} />,
            onClick: (row) => router.push(`/workshops/${row.id}`),
          },
          ...(canEdit
            ? [
                {
                  label: "Edit",
                  action: "edit",
                  icon: <EditIcon size={15} />,
                  onClick: (row: Workshop) => {
                    setSelectedWorkshop(row);
                    setFormOpen(true);
                  },
                },
              ]
            : []),
        ]}
      />

      <WorkshopDialogForm
        open={formOpen}
        workshop={selectedWorkshop}
        onClose={() => {
          setFormOpen(false);
          setSelectedWorkshop(null);
        }}
        onSuccess={() => void refetch()}
      />
    </>
  );
}
