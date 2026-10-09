"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/shared/data-table/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateTime } from "@/lib/format";
import { getAuditActionLabel } from "@/lib/messages";
import { AuditLogsTableFilters } from "./audit-logs-table-filters";
import { AuditLogDiffDialog } from "./audit-log-diff-dialog";
import type { AuditLog, AuditLogFilterState } from "../types";
import { EyeIcon } from "lucide-react";

export function AuditLogsTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial filters from URL
  const [filters, setFilters] = React.useState<AuditLogFilterState>(() => ({
    entity_type: (searchParams.get("entity_type") as "user" | "workshop") || undefined,
    action: searchParams.get("action") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  }));

  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);
  const [diffDialogOpen, setDiffDialogOpen] = React.useState(false);

  const updateUrlFilters = React.useCallback(
    (newFilters: AuditLogFilterState) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newFilters.entity_type) params.set("entity_type", newFilters.entity_type);
      else params.delete("entity_type");

      if (newFilters.action) params.set("action", newFilters.action);
      else params.delete("action");

      if (newFilters.from) params.set("from", newFilters.from);
      else params.delete("from");

      if (newFilters.to) params.set("to", newFilters.to);
      else params.delete("to");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const handleFilterChange = (partial: Partial<AuditLogFilterState>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...partial };
      updateUrlFilters(updated);
      return updated;
    });
  };

  const handleResetFilters = () => {
    const emptyFilters: AuditLogFilterState = {
      entity_type: undefined,
      action: undefined,
      from: undefined,
      to: undefined,
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
  } = useDataTable<AuditLog>({
    endpoint: "/audit-logs",
    queryKey: ["audit-logs-list"],
    defaultSort: {
      column: "created_at",
      direction: "desc",
    },
    extraParams: {
      entity_type: filters.entity_type,
      action: filters.action,
      from: filters.from,
      to: filters.to,
    },
  });

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: "created_at",
      header: "Timestamp",
      minSize: 170,
      cell: ({ row }) => (
        <span className="text-xs font-medium text-foreground">
          {formatDateTime(row.original.created_at)}
        </span>
      ),
    },
    {
      accessorKey: "user",
      header: "Actor",
      minSize: 140,
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-foreground">
          {row.original.user?.name || "System"}
        </span>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      minSize: 180,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            {getAuditActionLabel(row.original.action)}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            {row.original.action}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "entity_type",
      header: "Entity",
      minSize: 140,
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted border border-border/60 capitalize">
          {row.original.entity_type} #{row.original.entity_id}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Audit Trail"
        subtitle="System-wide activity log recording administrative changes, account edits, and workshop updates"
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        emptyDataMessage={
          globalFilter || filters.entity_type || filters.action || filters.from || filters.to
            ? {
                title: "No audit logs match your filters",
                description: "Try adjusting or clearing your search and filter criteria.",
              }
            : {
                title: "No audit records found",
                description: "Security and modification events will appear here as changes are performed.",
              }
        }
        pageSize={15}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        loading={isLoading}
        searchKeys="by actor or action"
        totalRecords={totalRecords ?? 0}
        pagination={pagination}
        setPagination={setPagination}
        sorting={sorting}
        setSorting={setSorting}
        onRowClick={(row) => {
          setSelectedLog(row);
          setDiffDialogOpen(true);
        }}
        renderCustomFilter={() => (
          <AuditLogsTableFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />
        )}
        rowActions={[
          {
            label: "View Diff",
            action: "diff",
            icon: <EyeIcon size={15} />,
            onClick: (row) => {
              setSelectedLog(row);
              setDiffDialogOpen(true);
            },
          },
        ]}
      />

      <AuditLogDiffDialog
        log={selectedLog}
        open={diffDialogOpen}
        onClose={() => {
          setDiffDialogOpen(false);
          setSelectedLog(null);
        }}
      />
    </>
  );
}
