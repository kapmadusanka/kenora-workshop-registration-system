"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table/data-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/core/Tabs";
import { Button } from "@/components/core/Button";
import { formatDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { useSession } from "next-auth/react";
import { useWorkshopRegistrations } from "@/features/registrations/hooks";
import { CancelRegistrationDialog } from "./cancel-registration-dialog";
import type { Registration, RegistrationTab } from "@/features/registrations/types";
import { XCircle, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RegistrationsListProps {
  workshopId: string | number;
}

export function RegistrationsList({ workshopId }: RegistrationsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // Filters from URL query string
  const currentTab = (searchParams.get("tab") as RegistrationTab) || "active";
  const currentQ = searchParams.get("q") || "";
  const currentPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  const [searchQuery, setSearchQuery] = React.useState(currentQ);
  const [prevQ, setPrevQ] = React.useState(currentQ);
  const [selectedToCancel, setSelectedToCancel] = React.useState<Registration | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);

  if (prevQ !== currentQ) {
    setPrevQ(currentQ);
    setSearchQuery(currentQ);
  }

  const updateUrl = React.useCallback(
    (newParams: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([k, v]) => {
        if (v === undefined || v === "") {
          params.delete(k);
        } else {
          params.set(k, v);
        }
      });

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [router, pathname, searchParams]
  );

  // Debounce search update to URL
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery !== currentQ) {
        updateUrl({ q: searchQuery || undefined, page: "1" });
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchQuery, currentQ, updateUrl]);

  const handleTabChange = (val: string) => {
    updateUrl({ tab: val, page: "1" });
  };

  const pagination: PaginationState = {
    pageIndex: currentPage - 1,
    pageSize: 15,
  };

  const setPagination: React.Dispatch<React.SetStateAction<PaginationState>> = (updater) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    updateUrl({ page: String(next.pageIndex + 1) });
  };

  const [sorting, setSorting] = React.useState<SortingState>([]);

  const { data, isLoading, isError, error, refetch, isFetching } = useWorkshopRegistrations(
    workshopId,
    {
      status: currentTab,
      q: currentQ || undefined,
      page: currentPage,
      per_page: 15,
    }
  );

  const canCancel = can("register_attendees", session?.user?.role);
  const counts = data?.meta?.counts;

  const columns: ColumnDef<Registration>[] = [
    {
      accessorKey: "attendee_name",
      header: "Attendee",
      minSize: 180,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-sm">
            {row.original.attendee_name}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {row.original.attendee_email}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      minSize: 100,
      cell: ({ row }) => {
        const isActive = row.original.status === "active";
        return (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize border",
              isActive
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
            )}
          >
            {row.original.status}
          </span>
        );
      },
    },
    {
      accessorKey: "registered_at",
      header: "Registered",
      minSize: 170,
      cell: ({ row }) => (
        <div className="flex flex-col text-xs">
          <span className="text-foreground font-medium">
            {formatDateTime(row.original.registered_at)}
          </span>
          <span className="text-muted-foreground text-[11px]">
            by {row.original.registered_by?.name || "System"}
          </span>
        </div>
      ),
    },
    {
      id: "cancellation_info",
      header: "Cancellation Info",
      minSize: 220,
      cell: ({ row }) => {
        if (row.original.status !== "cancelled") {
          return <span className="text-muted-foreground text-xs">—</span>;
        }

        return (
          <div className="flex flex-col text-xs space-y-0.5">
            <span className="text-rose-700 dark:text-rose-400 font-medium">
              Cancelled {formatDateTime(row.original.cancelled_at)}
            </span>
            <span className="text-muted-foreground text-[11px]">
              by {row.original.cancelled_by?.name || "System"}
            </span>
            {row.original.cancel_reason && (
              <span className="text-xs text-muted-foreground italic mt-0.5 line-clamp-2">
                &ldquo;{row.original.cancel_reason}&rdquo;
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Registrations & History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full audit log of active and cancelled attendees. Records are never deleted.
          </p>
        </div>

        {/* Tab switcher */}
        <Tabs
          value={currentTab}
          onValueChange={handleTabChange}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-3 w-full sm:w-auto h-9 bg-muted/80 p-1 rounded-xl">
            <TabsTrigger value="active" className="text-xs rounded-lg gap-1.5">
              <span>Active</span>
              {counts && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-background text-foreground shadow-xs">
                  {counts.active}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs rounded-lg gap-1.5">
              <span>Cancelled</span>
              {counts && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-background text-foreground shadow-xs">
                  {counts.cancelled}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs rounded-lg gap-1.5">
              <span>All</span>
              {counts && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-background text-foreground shadow-xs">
                  {counts.total}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isError ? (
        <div className="p-8 border border-destructive/20 bg-destructive/5 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              Failed to load registrations
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {(error as Error)?.message || "An unexpected error occurred while fetching registrations."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          totalRecords={data?.meta?.total ?? 0}
          pageSize={15}
          pagination={pagination}
          setPagination={setPagination}
          sorting={sorting}
          setSorting={setSorting}
          loading={isLoading || isFetching}
          globalFilter={searchQuery}
          setGlobalFilter={(val) => setSearchQuery(val ?? "")}
          searchKeys="by name or email"
          emptyDataMessage={
            currentQ
              ? {
                  title: "No registrations match your search",
                  description: "Try adjusting your search query or clear the filter.",
                }
              : currentTab === "cancelled"
              ? {
                  title: "No cancelled registrations",
                  description: "No attendees have cancelled their seats for this workshop.",
                }
              : {
                  title: "No registrations yet",
                  description: "Register the first attendee using the form above.",
                }
          }
          rowActions={
            canCancel
              ? [
                  {
                    label: "Cancel Registration",
                    action: "cancel",
                    variant: "outlineDanger",
                    icon: <XCircle className="h-3.5 w-3.5 text-destructive" />,
                    onClick: (row) => {
                      setSelectedToCancel(row);
                      setCancelDialogOpen(true);
                    },
                    disabled: (row) => row.status !== "active",
                  },
                ]
              : []
          }
          onRowAction={(_action, row) => {
            if (row.status === "active") {
              setSelectedToCancel(row);
              setCancelDialogOpen(true);
            }
          }}
        />
      )}

      <CancelRegistrationDialog
        workshopId={workshopId}
        registration={selectedToCancel}
        open={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false);
          setSelectedToCancel(null);
        }}
      />
    </div>
  );
}
