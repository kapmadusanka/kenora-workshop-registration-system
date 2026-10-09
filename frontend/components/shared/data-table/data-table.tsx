"use client";

import React, { useState } from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    PaginationState,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Typography } from "@/components/core/typography";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { DataTablePagination } from "./data-table-pagination";
import {DataTableToolbar, SortOption} from "./data-table-toolbar";
import { Button } from "@/components/core/Button";
import TruncatedCell from "@/components/shared/data-table/truncated-cell";


type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    emptyDataMessage?: {
        title: string;
        description: string;
    };
    totalRecords: number;
    pageSize?: number;
    className?: string;
    searchKeys?: string;
    globalFilter?: string;
    setGlobalFilter?: (value: string | undefined) => void;
    loading?: boolean;
    pagination: PaginationState;
    setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
    sorting: SortingState;
    setSorting: React.Dispatch<React.SetStateAction<SortingState>>;
    sortOptions?: SortOption[];
    renderCustomFilter?: () => React.ReactNode;
    onRowAction?: (action: string, row: TData) => void;
    rowActions?: Array<{
        label: string;
        action: string;
        variant?: "outline" | "outlineDanger";
        icon?: React.ReactNode;
        render?: (row: TData) => React.ReactNode;
        onClick?: (row: TData) => void;
        disabled?: boolean | ((row: TData) => boolean);
    }>;
    hideSearch?: boolean;
};

export function DataTable<TData, TValue>({
                                             columns,
                                             data,
                                             emptyDataMessage = {
                                                 title: "No data available",
                                                 description: "",
                                             },
                                             pageSize = 10,
                                             className,
                                             searchKeys,
                                             globalFilter,
                                             setGlobalFilter,
                                             loading = false,
                                             totalRecords,
                                             pagination,
                                             setPagination,
                                             sorting,
                                             setSorting,
                                             sortOptions,
                                             renderCustomFilter,
                                             onRowAction,
                                             rowActions = [],
                                             hideSearch,
                                         }: DataTableProps<TData, TValue>) {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState({});

    const tableColumns = React.useMemo(() => {
        const cols = [...columns];

        // Add actions column if row actions are provided
        if (onRowAction && rowActions.length > 0) {
            cols.push({
                accessorKey: "actions",
                header: "Actions",
                enableSorting: false,
                enableHiding: false,
                maxSize: 130,
                size: 130,
                cell: ({ row }) => {
                    return (
                        <div className="flex gap-2 items-center pr-4">
                            {rowActions.map((action) => {
                                if (action.render) {
                                    return action.render(row.original);
                                }
                                const isDisabled =
                                    typeof action.disabled === "function"
                                        ? action.disabled(row.original)
                                        : action.disabled;
                                return (
                                    <Button
                                        key={action.action}
                                        className="max-h-[30px]"
                                        variant={action.variant || "outline"}
                                        disabled={isDisabled}
                                        aria-label={action.label}
                                        onClick={() => {
                                            if (action?.onClick) {
                                                action.onClick(row.original);
                                            } else {
                                                onRowAction(action.action, row.original);
                                            }
                                        }}
                                        size="sm"
                                    >
                                        {action.icon && (
                                            <span aria-hidden="true">{action.icon}</span>
                                        )}
                                    </Button>
                                );
                            })}
                        </div>
                    );
                },
            });
        }

        return cols;
    }, [columns, onRowAction, rowActions]);

    const table = useReactTable({
        data,
        columns: tableColumns,
        pageCount: Math.ceil(totalRecords / pageSize),
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
            pagination,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onPaginationChange: setPagination,
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
    });

    const totalColumnSize = table
        .getFlatHeaders()
        .reduce((sum, header) => sum + header.column.getSize(), 0);

    const shouldShowToolbar = (data?.length ?? 0) > 0 || !!globalFilter;

    return (
        <div
            className={`${className} lg:px-8 sm:px-5 px-2 sm:pb-8 pb-4 sm:pt-4 pt-2 bg-white mb-20 rounded-md relative`}
        >
            {shouldShowToolbar && (
                <DataTableToolbar
                    globalFilter={globalFilter}
                    setGlobalFilter={setGlobalFilter}
                    searchKeys={searchKeys}
                    sorting={sorting}
                    setSorting={setSorting}
                    sortOptions={sortOptions ?? []}
                    renderCustomFilter={renderCustomFilter}
                    hideSearch={hideSearch}
                />
            )}
            <div className="rounded-md border overflow-x-auto lg:overflow-x-hidden">
                {!loading && table.getRowModel().rows?.length === 0 ? (
                    <div className="bg-white p-6 py-10 rounded-sm">
                        <div className="flex flex-col justify-center items-center sm:gap-2 gap-1 sm:py-16 py-8">
                            <Typography className="text-center font-semibold text-[1rem] text-gray-500">
                                {emptyDataMessage?.title}
                            </Typography>
                            <Typography className="text-sm">{emptyDataMessage?.description}</Typography>
                        </div>
                    </div>
                ) : (
                    <Table className="w-full lg:table-fixed">
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header, index) => (
                                        <TableHead
                                            className="px-4 md:px-3 text-[10px] text-center text-gray-400 uppercase"
                                            key={header.id}
                                            style={{
                                                width:
                                                    totalColumnSize > 0
                                                        ? `${(header.column.getSize() / totalColumnSize) * 100}%`
                                                        : undefined,
                                                paddingLeft: `${index === 0 && "2rem"}`,
                                            }}
                                        >
                                            {header.isPlaceholder ? null : (
                                                header.column.getCanSort() ? (
                                                    <button
                                                        type="button"
                                                        className="flex items-center gap-1.5 cursor-pointer select-none group hover:text-gray-700 w-full"
                                                        onClick={header.column.getToggleSortingHandler()}
                                                        aria-label={`Sort by ${flexRender(header.column.columnDef.header, header.getContext())}`}
                                                    >
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                        <span className="inline-flex items-center" aria-hidden="true">
                                                            {header.column.getIsSorted() === "asc" ? (
                                                                <ArrowUp className="w-3.5 h-3.5 text-primary" />
                                                            ) : header.column.getIsSorted() === "desc" ? (
                                                                <ArrowDown className="w-3.5 h-3.5 text-primary" />
                                                            ) : (
                                                                <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                                                            )}
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                    </div>
                                                )
                                            )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length + (onRowAction && rowActions.length > 0 ? 1 : 0)}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        <div className="flex justify-center items-center h-[25vh]">
                                            <Spinner className="size-8" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row, index) => (
                                    <TableRow
                                        key={row.id}
                                        className={index % 2 === 0 ? "bg-gray-100 dark:bg-gray-800/40" : ""}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell, index) => {
                                            const content = flexRender(cell.column.columnDef.cell, cell.getContext());
                                            const isActionsColumn = cell.column.id === "actions";
                                            const disableTruncate = (cell.column.columnDef.meta as { disableTruncate?: boolean })?.disableTruncate;

                                            return (
                                                <TableCell
                                                    className={`px-4 ${index === 0 && "pl-8!"} md:px-3 text-gray-500 text-sm`}
                                                    key={cell.id}
                                                >
                                                    {isActionsColumn || disableTruncate ? content : <TruncatedCell content={content} />}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No data available
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
                {/* {JSON.stringify(data, null, 2)} */}
            </div>

            {/* Pagination */}
            {table.getRowModel().rows?.length > 0 && (
                <DataTablePagination
                    table={table}
                    totalRecords={totalRecords}
                />
            )}
        </div>
    );
}
