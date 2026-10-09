"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/shared/data-table/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/core/Button";
import { RoleBadge } from "@/components/core/RoleBadge";
import { formatDate } from "@/lib/format";
import { UsersTableFilters } from "./users-table-filters";
import { UserDialogForm } from "./user-dialog-form";
import type { User, UserFilterState } from "../types";
import { EditIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function UsersListTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial filters from URL
  const [filters, setFilters] = React.useState<UserFilterState>(() => ({
    role: searchParams.get("role") || undefined,
    is_active: searchParams.get("is_active") || undefined,
  }));

  const [formOpen, setFormOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  const updateUrlFilters = React.useCallback(
    (newFilters: UserFilterState) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newFilters.role) params.set("role", newFilters.role);
      else params.delete("role");

      if (newFilters.is_active) params.set("is_active", newFilters.is_active);
      else params.delete("is_active");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const handleFilterChange = (partial: Partial<UserFilterState>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...partial };
      updateUrlFilters(updated);
      return updated;
    });
  };

  const handleResetFilters = () => {
    const emptyFilters = {
      role: undefined,
      is_active: undefined,
    };
    setFilters(emptyFilters);
    updateUrlFilters(emptyFilters);
  };

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
  } = useDataTable<User>({
    endpoint: "/users",
    queryKey: ["users-list"],
    defaultSort: {
      column: "name",
      direction: "asc",
    },
    extraParams: {
      role: filters.role,
      is_active: filters.is_active,
    },
  });

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Name",
      minSize: 180,
      cell: ({ row }) => (
        <span className="font-semibold text-foreground text-sm">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      minSize: 220,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      minSize: 120,
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      minSize: 110,
      cell: ({ row }) => {
        const active = row.original.is_active;
        return (
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border",
              active
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
            )}
          >
            {active ? "Active" : "Deactivated"}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      minSize: 130,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Manage system users and access roles across training centres"
        actions={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setSelectedUser(null);
                setFormOpen(true);
              }}
              variant="primary"
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create User</span>
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        emptyDataMessage={
          globalFilter || filters.role || filters.is_active
            ? {
                title: "No users match your filters",
                description: "Try adjusting or resetting your search and filter criteria.",
              }
            : {
                title: "No users found",
                description: "Click 'Create User' to add an administrator, manager, or staff member.",
              }
        }
        pageSize={15}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        loading={isLoading}
        searchKeys="by name or email"
        totalRecords={totalRecords ?? 0}
        pagination={pagination}
        setPagination={setPagination}
        sorting={sorting}
        setSorting={setSorting}
        renderCustomFilter={() => (
          <UsersTableFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />
        )}
        rowActions={[
          {
            label: "Edit",
            action: "edit",
            icon: <EditIcon size={15} />,
            onClick: (row) => {
              setSelectedUser(row);
              setFormOpen(true);
            },
          },
        ]}
      />

      <UserDialogForm
        open={formOpen}
        user={selectedUser}
        onClose={() => {
          setFormOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={() => void refetch()}
      />
    </>
  );
}
