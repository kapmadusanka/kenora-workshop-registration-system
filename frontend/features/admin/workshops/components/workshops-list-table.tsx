"use client"
import {ColumnDef} from "@tanstack/react-table";
import {useFormCrudManager} from "@/hooks/use-form-crud";
import {useDataTable} from "@/hooks/use-data-table";
import {DataTable} from "@/components/shared/data-table/data-table";
import {OpType} from "@/constants/common";
import {EditIcon, EyeIcon, TrashIcon} from "lucide-react";
import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/core/Button";
import {
    Receipt,
} from "lucide-react";
import {Typography} from "@/components/core/typography";
import {Workshop} from "@/features/admin/workshops/types/workshops-types";
import {WorkshopFormContainer} from "@/features/admin/workshops/components/workshops-form-container";

export function WorkshopListTable() {
    const columns: ColumnDef<Workshop>[] = [
        {
            accessorKey: "name",
            header: "Name",
            minSize: 120,
        },
        {
            accessorKey: "description",
            header: "Description",
            minSize: 280,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.original.isActive;
                return (
                    <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            status
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                        }`}
                    >
                        {status?"Active":"Inactive"}
                    </span>
                );
            }

        }
    ];


    const crud = useFormCrudManager<Workshop>({
        endpoint: {
            create: "/workshops",
            common: "/workshops",
        },
        queryKey: "workshops",
        extraInvalidationKeys: [["workshops-list"]]
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
        endpoint:  "/workshops",
        queryKey: ["workshops-list"],
        defaultSort: {
            column: "name",
            direction: "desc",
        },
    });

    return <>
        {/* Top Header */}
        <PageHeader
            title={'Workshop'}
            subtitle={'Workshop'}
            actions={
                <div className="flex items-center gap-3">
                    <Button onClick={()=>crud.onAddNew()} variant={"primary"} size={"sm"} className={"bg-primary"}>
                        <Typography  className={"flex items-center gap-2"}>
                            <Receipt className="h-5 w-5" />
                            <span>Add Workshop</span>
                        </Typography>
                    </Button>
                </div>
            }
        />

        <DataTable
            columns={columns}
            data={data ?? []}
            emptyDataMessage={
                globalFilter
                    ? {
                        title: "No results found",
                        description: "",
                    }
                    : {
                        title: "No workshop have been added yet",
                        description: "Add your first workshop to get started",
                    }
            }
            pageSize={10}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            loading={isLoading}
            searchKeys="by name"
            totalRecords={totalRecords ?? 0}
            pagination={pagination}
            setPagination={setPagination}
            sorting={sorting}
            setSorting={setSorting}
            onRowAction={crud.onRowAction}
            rowActions={[
                { label: "view", action: OpType.View, icon: <EyeIcon size={15} /> },
                {
                    label: "edit",
                    action: OpType.Edit,
                    icon: <EditIcon size={15} />,
                },
                {
                    label: "delete",
                    action: OpType.SoftDelete,
                    icon: <TrashIcon size={15} />,
                },
            ]}
        />
        <WorkshopFormContainer crud={crud} />
    </>
}
