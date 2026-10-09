"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps<TData> {
    table: Table<TData>;
    totalRecords: number;
    compact?: boolean;
}

export function DataTablePagination<TData>({
                                               table,
                                               totalRecords,
                                               compact,
                                           }: DataTablePaginationProps<TData>) {
    const { pageIndex, pageSize } = table.getState().pagination;

    const totalPages = Math.ceil(totalRecords / pageSize);
    const currentPage = pageIndex + 1; // 1-based for display

    const startRecord = pageIndex * pageSize + 1;
    const endRecord = Math.min(startRecord + pageSize - 1, totalRecords);

    const getPageNumbers = (): (number | string)[] => {
        const maxVisible = compact ? 2 : 5; // how many numbers to show (adjustable)
        const side = compact ? 1 : 2; // pages shown on each side of current

        if (totalPages <= maxVisible + 2) {
            // Few pages → show all
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | string)[] = [];

        // Always include first page
        pages.push(1);

        // Left ellipsis?
        if (currentPage > side + 2) {
            pages.push("…");
        }

        // Pages around current
        for (
            let i = Math.max(2, currentPage - side);
            i <= Math.min(totalPages - 1, currentPage + side);
            i++
        ) {
            pages.push(i);
        }

        // Right ellipsis?
        if (currentPage < totalPages - side - 1) {
            pages.push("…");
        }

        // Always include last page (if not already included)
        if (pages[pages.length - 1] !== totalPages) {
            pages.push(totalPages);
        }

        return pages;
    };
    const pageNumbers = getPageNumbers();

    // Size classes driven by compact flag
    const navBtnSize = compact ? "h-6 w-6" : "h-8 w-8";
    const pageBtnSize = compact ? "h-7 w-7" : "h-9 w-9";

    return (
        <div className="flex items-center justify-between px-2 mt-4">
            <div className="flex flex-wrap gap-2 lg:items-center space-y-2 lg:space-y-0 lg:space-x-8">
                <div className="flex items-center space-x-2">
                    {/*<Button*/}
                    {/*  variant="outline"*/}
                    {/*  className="hidden h-8 w-8 bg-transparent p-0 lg:flex"*/}
                    {/*  onClick={() => table.setPageIndex(0)}*/}
                    {/*  disabled={!table.getCanPreviousPage()}*/}
                    {/*>*/}
                    {/*  <span className="sr-only">Go to first page</span>*/}
                    {/*  <ChevronsLeft className="h-4 w-4" />*/}
                    {/*</Button>*/}
                    <Button
                        type={"button"}
                        variant="outline"
                        className={cn("bg-transparent p-0 cursor-pointer", navBtnSize)}
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
                    </Button>
                    {pageNumbers.map((pageNum, idx) => {
                        if (pageNum === "…") {
                            return (
                                <span
                                    key={`ellipsis-${idx}`}
                                    className={cn(
                                        "flex items-center justify-center text-sm",
                                        pageBtnSize,
                                    )}
                                >
                                    …
                                </span>
                            );
                        }

                        const isActive = pageNum === currentPage;

                        return (
                            <Button
                                type={"button"}
                                key={pageNum}
                                variant={isActive ? "default" : "ghost"}
                                size="icon"
                                className={cn(
                                    "rounded-md cursor-pointer",
                                    pageBtnSize,
                                    compact && "text-xs",
                                    isActive && "bg-primary text-primary-foreground",
                                )}
                                onClick={() => table.setPageIndex((pageNum as number) - 1)}
                            >
                                {pageNum}
                            </Button>
                        );
                    })}
                    {pageNumbers.length > 1 && (
                        <Button
                            type={"button"}
                            variant="outline"
                            className={cn("bg-transparent p-0 cursor-pointer", navBtnSize)}
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to next page</span>
                            <ChevronRight className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
                        </Button>
                    )}
                    {/*<Button*/}
                    {/*  variant="outline"*/}
                    {/*  className="hidden h-8 w-8 bg-transparent p-0 lg:flex"*/}
                    {/*  onClick={() => table.setPageIndex(table.getPageCount() - 1)}*/}
                    {/*  disabled={!table.getCanNextPage()}*/}
                    {/*>*/}
                    {/*  <span className="sr-only">Go to last page</span>*/}
                    {/*  <ChevronsRight className="h-4 w-4" />*/}
                    {/*</Button>*/}
                </div>

                <div className="flex lg:gap-8 gap-4 items-center">
                    <div className="text-muted-foreground lg:flex-1 text-sm">
                        Records {startRecord} to {endRecord}
                    </div>
                    <div className="flex items-center space-x-2 mb-auto">
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value) => {
                                table.setPageSize(Number(value));
                            }}
                        >
                            <SelectTrigger
                                className={cn(
                                    "w-[70px] cursor-pointer",
                                    compact ? "h-6 text-xs px-2 py-1 " : "max-h-9",
                                )}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    );
}
