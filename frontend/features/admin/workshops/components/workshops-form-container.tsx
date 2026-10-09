// import {FormCrudContextType} from "@/types/common.types";
import {FormCrudProvider} from "@/context/form-crud.context";

import {OpType} from "@/constants/common";
import {ConfirmDialog} from "@/components/core/confirm-dialog";
import {Workshop} from "@/features/admin/workshops/types/workshops-types";
import WorkshopForm from "@/features/admin/workshops/components/workshops-form";


type FormCrudContextType = {
    selectedItem: Partial<Workshop> | null;
    isLoading: boolean;
    isCreating: boolean;
    isUpdating: boolean;
    handleCreate: (data: Partial<Workshop>) => void;
    handleEdit: (data: Partial<Workshop>) => void;
    isDeleting: boolean;
    isSoftDeleting: boolean;
    setSelectedItem: (item: Partial<Workshop> | null) => void;
    setDeleteDialogOpen: (open: boolean) => void;
    setOpenFormPopup: (open: boolean) => void;
    setOpTypeState: (opType: OpType) => void;
    deleteDialogOpen: boolean;
    openFormPopup: boolean;
    opTypeState: OpType;
    initialData: Partial<Workshop>;
    onAddNew: () => void;
    handleClientDelete?: () => void;
    handleDelete: () => void;
    handleSoftDelete: () => void;
};

type ComponentCrudType = {
    crud: FormCrudContextType;
};



export function WorkshopFormContainer({ crud }: ComponentCrudType) {
    const { isDeleting, setDeleteDialogOpen, deleteDialogOpen } = crud;

    const handleWorkshopDelete = () => {
        crud?.handleDelete();
    };

    return (
        <>
            <FormCrudProvider<Workshop>
                value={{
                    open: crud.openFormPopup,
                    opType: crud.opTypeState,
                    initialData: crud.initialData,
                    isLoading: crud.isLoading,
                    isCreating: crud.isCreating,
                    isUpdating: crud.isUpdating,
                    openForm: crud.onAddNew,
                    closeForm: () => crud.setOpenFormPopup(false),
                    handleCreate: crud.handleCreate,
                    handleEdit: crud.handleEdit,
                    selectedItem: crud.selectedItem,
                    setOpType: crud.setOpTypeState,
                }}
            >
                <WorkshopForm />
            </FormCrudProvider>

            <ConfirmDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleWorkshopDelete}
                title="Delete Workshop"
                description={
                    <>
                        Are you sure you want to delete this Workshop? This action cannot be undone.
                    </>
                }
                isLoading={isDeleting}
                confirmText="Delete"
                confirmButtonVariant="dangerPrimary"
            />
        </>
    )
}
