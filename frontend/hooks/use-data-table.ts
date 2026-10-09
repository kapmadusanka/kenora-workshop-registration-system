import { useEffect, useState } from "react";
import { SortingState } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface ColumnFilters {
  id: string;
  value: string | number | boolean;
}

interface UseDataTableOptions {
  endpoint: string;
  queryKey: string[];
  defaultSort?: {
    column: string;
    direction: "asc" | "desc";
  };
  loading?: boolean;
  idKey?: string;
  extraParams?: Record<string, unknown>;
}

interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

interface PaginatedResponse<T> {
  success?: boolean;
  message?: string;
  data: T[] | T;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  totalRecords?: number;
  meta?: {
    current_page?: number;
    from?: number | null;
    last_page?: number;
    per_page?: number;
    to?: number | null;
    total?: number;
  };
  paginationData?: {
    total?: number;
    totalCount?: number;
    pageNumber?: number;
    pageSize?: number;
    totalPages?: number;
  } | null;
}

export function useDataTable<TData>({
  endpoint,
  queryKey,
  defaultSort,
  extraParams,
}: UseDataTableOptions) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>(
    defaultSort
      ? [{ id: defaultSort.column, desc: defaultSort.direction === "desc" }]
      : []
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFilters[]>([]);
  const [globalFilter, setGlobalFilter] = useState<string | undefined>("");
  const [rowSelection, setRowSelection] = useState({});

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    PaginatedResponse<TData>
  >({
    queryKey: [...queryKey, pagination, sorting, columnFilters, globalFilter, extraParams],
    queryFn: async () => {
      const filterParams = columnFilters.reduce(
        (acc, filter) => {
          acc[filter.id] = filter.value;
          return acc;
        },
        {} as Record<string, string | number | boolean>
      );

      const sortParam = sorting.length
        ? (sorting[0].desc ? `-${sorting[0].id}` : sorting[0].id)
        : null;

      const params: Record<string, unknown> = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        pageSize: pagination.pageSize,
        sort: sortParam,
        sortBy: sorting.length ? sorting[0].id : null,
        sortDirection: sorting.length
          ? sorting[0].desc
            ? "desc"
            : "asc"
          : null,
        q: globalFilter || undefined,
        search: globalFilter || undefined,
        ...filterParams,
        ...extraParams,
      };

      // Clean undefined or empty string params
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === "") {
          delete params[key];
        }
      });

      const response = await apiClient.get<PaginatedResponse<TData>>(endpoint, {
        params,
      });

      const raw = response.data;

      // Normalize total records across Laravel API resources, legacy pagination, and direct values
      const totalRecords =
        raw.totalRecords ??
        raw.meta?.total ??
        raw.paginationData?.total ??
        (Array.isArray(raw.data) ? raw.data.length : 0);

      return { ...raw, totalRecords };
    },
    enabled: !!endpoint,
  });

  // Auto-correct page index when records are removed and current page exceeds total
  useEffect(() => {
    if (
      data?.totalRecords !== undefined &&
      data.totalRecords <= pagination.pageIndex * pagination.pageSize &&
      pagination.pageIndex > 0
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPagination((prev) => ({
        ...prev,
        pageIndex: Math.max(
          Math.ceil((data.totalRecords ?? 0) / pagination.pageSize) - 1,
          0
        ),
      }));
    }
  }, [data?.totalRecords, pagination.pageIndex, pagination.pageSize]);

  const recordList = (Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
    ? data
    : []) as TData[];

  return {
    data: recordList,
    totalRecords: data?.totalRecords ?? 0,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    pagination,
    setPagination,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    globalFilter,
    setGlobalFilter,
    rowSelection,
    setRowSelection,
  };
}
