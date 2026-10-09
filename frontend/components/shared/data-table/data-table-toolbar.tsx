"use client";
import { Input } from "@/components/ui/input";
import React, { useEffect, useState } from "react";
import { SortingState } from "@tanstack/react-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SortIcon from "@/components/icons/sort-icon";
import { Search } from "lucide-react";

export interface SortOption {
    label: string;
    value: string;
}

interface DataTableToolbarProps {
    searchKeys: string | undefined;
    globalFilter: string | undefined;
    setGlobalFilter: ((value: string | undefined) => void) | undefined;
    sorting?: SortingState;
    setSorting?: (updater: SortingState) => void;
    sortOptions?: SortOption[];
    renderCustomFilter?: () => React.ReactNode;
    hideSearch?: boolean;
}

export function DataTableToolbar({
    searchKeys,
    globalFilter,
    setGlobalFilter,
    sorting,
    setSorting,
    sortOptions = [],
    renderCustomFilter,
    hideSearch = false,
}: DataTableToolbarProps) {
    const [searchValue, setSearchValue] = useState(globalFilter ?? "");
    const [prevGlobalFilter, setPrevGlobalFilter] = useState(globalFilter);

    if (globalFilter !== prevGlobalFilter) {
        setPrevGlobalFilter(globalFilter);
        setSearchValue(globalFilter ?? "");
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            if (setGlobalFilter) {
                setGlobalFilter(searchValue);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchValue, setGlobalFilter]);

    return (
        <div className="flex md:flex-row flex-col items-start lg:items-center gap-4 justify-between py-4">
            {!hideSearch && (
                <div className="relative sm:min-w-[16rem] lg:min-w-[18rem] max-lg:w-full md:max-w-[60%]">
                    <Input
                        placeholder={`Search ${searchKeys ?? ""}`}
                        value={searchValue ?? ""}
                        onChange={(event) => setSearchValue(event.target.value)}
                        className="pr-9"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
            )}
            <div className={`flex ml-auto ${hideSearch ? "w-full" : ""} gap-4 items-center`}>
                {sortOptions.length > 0 && setSorting && (
                    <Select
                        value={sorting?.[0]?.id ? `${sorting[0].id}:${sorting[0].desc ? "desc" : "asc"}` : ""}
                        onValueChange={(val) => {
                            if (!val) {
                                setSorting([]);
                                return;
                            }
                            const [id, dir] = val.split(":");
                            setSorting([{ id, desc: dir === "desc" }]);
                        }}
                    >
                        <SelectTrigger className="w-[160px] gap-2">
                            <SortIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            {sortOptions.map((opt) => (
                                <React.Fragment key={opt.value}>
                                    <SelectItem value={`${opt.value}:asc`}>{opt.label} (A→Z)</SelectItem>
                                    <SelectItem value={`${opt.value}:desc`}>{opt.label} (Z→A)</SelectItem>
                                </React.Fragment>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {renderCustomFilter && renderCustomFilter()}
            </div>
        </div>
    );
}
