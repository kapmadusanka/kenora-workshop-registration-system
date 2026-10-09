"use client";

import * as React from "react";
import { FormCrudProvider } from "@/context/form-crud.context";
import { ConfirmDialog } from "@/components/core/confirm-dialog";
import { OpType } from "@/constants/common";

/**
 * The subset of `useFormCrudManager`'s return value that this container needs.
 * Typed generically so it works for any domain entity (Shop, User, Product, …).
 */
export interface FeatureFormCrudProps<T> {
  selectedItem: Partial<T> | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  handleCreate: (data: Partial<T>) => void;
  handleEdit: (data: Partial<T>) => void;
  isDeleting: boolean;
  isSoftDeleting: boolean;
  setSelectedItem: (item: Partial<T> | null) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  setOpenFormPopup: (open: boolean) => void;
  setOpTypeState: (opType: OpType) => void;
  deleteDialogOpen: boolean;
  openFormPopup: boolean;
  opTypeState: OpType;
  initialData: Partial<T>;
  onAddNew: () => void;
  handleDelete: () => void;
  handleSoftDelete: () => void;
}

interface FeatureFormContainerProps<T> {
  crud: FeatureFormCrudProps<T>;
  /** The feature-specific form component (e.g. <ShopForm />, <UserForm />). */
  Form: React.ComponentType;
  /** Controls whether the ConfirmDialog triggers a soft-delete or hard delete. */
  deleteMode?: "soft" | "hard";
  deleteDialog?: {
    title?: string;
    description?: React.ReactNode;
    confirmText?: string;
  };
}

/**
 * Generic container that wires `useFormCrudManager`'s state into
 * `FormCrudProvider` + the feature form + a confirm-delete dialog.
 *
 * Eliminates the near-identical copy-paste that previously existed
 * in ShopFormContainer and UserFormContainer.
 *
 * Usage:
 * ```tsx
 * <FeatureFormContainer
 *   crud={crud}
 *   Form={ShopForm}
 *   deleteMode="soft"
 *   deleteDialog={{ title: "Delete Shop", confirmText: "Delete" }}
 * />
 * ```
 */
export function FeatureFormContainer<T>({
  crud,
  Form,
  deleteMode = "soft",
  deleteDialog = {},
}: FeatureFormContainerProps<T>) {
  const { isDeleting, isSoftDeleting, setDeleteDialogOpen, deleteDialogOpen } =
    crud;

  const handleConfirmDelete = () => {
    if (deleteMode === "soft") {
      crud.handleSoftDelete();
    } else {
      crud.handleDelete();
    }
  };

  const {
    title = "Delete Record",
    description = (
      <>Are you sure you want to delete this record? This action cannot be undone.</>
    ),
    confirmText = "Delete",
  } = deleteDialog;

  return (
    <>
      <FormCrudProvider<T>
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
        <Form />
      </FormCrudProvider>

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={title}
        description={description}
        isLoading={deleteMode === "soft" ? isSoftDeleting : isDeleting}
        confirmText={confirmText}
        confirmButtonVariant="dangerPrimary"
      />
    </>
  );
}
