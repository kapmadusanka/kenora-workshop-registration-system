import { useEffect, useState } from "react";
import { SortingState } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import {apiClient} from "@/lib/api-client";

interface ColumnFilters {
  id: string;
  value: string | number | boolean;
}

interface UseDataTableOptions<TData> {
  endpoint: string;
  queryKey: string[];
  defaultSort?: {
    column: string;
    direction: "asc" | "desc";
  };
  loading?: boolean;
  idKey?: string;
}

interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[] | T;
  page: number;
  pageSize: number;
  totalPages: number;
  /**
   * The total number of records across all pages. The API may return this
   * directly as `totalRecords`, or nested under `paginationData.total`.
   * Both shapes are normalized here so callers get a consistent value.
   */
  totalRecords: number;
  // Legacy & backend response shapes for pagination metadata
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
}: UseDataTableOptions<TData>) {
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
    queryKey: [...queryKey, pagination, sorting, columnFilters, globalFilter],
    queryFn: async () => {
      const filterParams = columnFilters.reduce(
        (acc, filter) => {
          acc[filter.id] = filter.value;
          return acc;
        },
        {} as Record<string, string | number | boolean>
      );

      const response = await apiClient.get<PaginatedResponse<TData>>(endpoint, {
        params: {
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          sortBy: sorting.length ? sorting[0].id : null,
          sortDirection: sorting.length
            ? sorting[0].desc
              ? "desc"
              : "asc"
            : null,
          search: globalFilter || undefined,
          ...filterParams,
        },
      });

      const raw = response.data;

      // Normalize the total records field — the API may return it directly
      // as `totalRecords` (preferred) or nested under `paginationData.total`
      // (legacy). Either way we surface it as `totalRecords` for consumers.
      const totalRecords =
        raw.totalRecords ??
        raw.paginationData?.total ??
        0;

      return { ...raw, totalRecords };
    },
    enabled: !!endpoint,
  });

  // Auto-correct the page index when records are deleted and the current
  // page becomes empty (e.g. the last page with 1 record gets deleted).
  useEffect(() => {
    if (
      data?.totalRecords !== undefined &&
      data.totalRecords <= pagination.pageIndex * pagination.pageSize &&
      pagination.pageIndex > 0
    ) {
      setPagination((prev) => ({
        ...prev,
        pageIndex: Math.max(
          Math.ceil(data.totalRecords / pagination.pageSize) - 1,
          0
        ),
      }));
    }
  }, [data?.totalRecords, pagination.pageIndex, pagination.pageSize]);

  return {
    data: data?.data as TData[],
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
