import { FieldValues, UseFormReturn } from "react-hook-form";
import { ReactNode, useCallback } from "react";
import { z } from "zod";
import { useFormCrudContext } from "@/context/form-crud.context";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OpType } from "@/constants/common";
import { Button } from "@/components/core/Button";
import { Spinner } from "@/components/ui/spinner";
import { LoadingButton } from "@/components/core/loading-button";
import FormBase from "@/components/shared/forms/base-form";
import { FieldGroup } from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TitleType = {
  create?: string;
  edit?: string;
  view?: string;
};

type FormDialogProps<TSchema extends FieldValues> = {
  title?: TitleType;
  buttonTitle?: TitleType;
  formRef: React.RefObject<UseFormReturn<TSchema> | null>;
  schema: z.ZodType<TSchema, z.ZodTypeDef, unknown>;
  handleFormSubmit?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  formId?: string;
  onSubmit: (data: TSchema) => void;
  contentStyle?: React.CSSProperties;
  mode?: "onChange" | "onBlur" | "onSubmit" | "onTouched" | "all";
  isSubmitting?: boolean;
};

export function FormDialog<TSchema extends FieldValues>({
  title = {
    create: "Create Record",
    edit: "Edit Record",
    view: "View Record",
  },
  buttonTitle = {
    create: "Create Record",
    edit: "Save Changes",
    view: "Edit Record",
  },
  formRef,
  schema,
  onSubmit,
  children,
  formId = "form-dialog",
  contentStyle,
  mode,
  isSubmitting,
}: FormDialogProps<TSchema>) {
  const {
    open,
    opType,
    initialData,
    isLoading,
    isCreating,
    isUpdating,
    closeForm,
    isFormDirty,
    setIsFormDirty,
    showWarning,
    setShowWarning,
    setOpType,
  } = useFormCrudContext<TSchema>();

  const dialogTitle =
    opType === OpType.Edit
      ? title.edit
      : opType === OpType.View
      ? title.view
      : title.create;

  const buttonLabel =
    opType === OpType.Edit
      ? buttonTitle?.edit
      : opType === OpType.View
      ? buttonTitle?.view
      : buttonTitle?.create;

  const onCloseDialog = () => {
    // Warn the user if they have unsaved changes before dismissing.
    if (isFormDirty && opType !== OpType.View) {
      setShowWarning(true);
    } else {
      closeForm();
    }
  };

  const onFormDirtyChange = useCallback(
    (isDirty: boolean) => {
      setIsFormDirty(isDirty);
    },
    [setIsFormDirty]
  );

  return (
    <>
      <Dialog open={open}>
        <DialogContent
          onPointerOutCapture={(e) => {
            e.preventDefault();
          }}
          className="sm:max-w-lg max-h-[90vh] overflow-y-auto [&>button]:hidden transition-[max-width,min-width] duration-200 ease-in-out font-montserrat"
          style={contentStyle}
        >
          <DialogHeader className="border-b pb-2 lg:pb-4">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="absolute right-4 top-4 border-none shadow-none"
              onClick={onCloseDialog}
              aria-label="Close dialog"
            >
              <span className="font-bold text-sm" aria-hidden="true">
                ✕
              </span>
            </Button>
            <DialogTitle className="text-sm font-semibold text-black text-left">
              {dialogTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="pt-2 pb-4">
            {isLoading ? (
              <div
                className="flex justify-center items-center h-[55vh]"
                aria-live="polite"
                aria-busy="true"
              >
                <Spinner className="size-8" />
              </div>
            ) : (
              <FormBase
                ref={formRef}
                formId={formId}
                onSubmit={onSubmit}
                schema={schema}
                defaultValues={initialData}
                onFormDirtyChange={onFormDirtyChange}
                mode={mode}
              >
                <FieldGroup className="gap-3">{children}</FieldGroup>
              </FormBase>
            )}

            <DialogFooter>
              <div className="flex justify-end gap-2 pt-6">
                <Button
                  variant="outline"
                  disabled={isLoading}
                  onClick={onCloseDialog}
                >
                  Cancel
                </Button>
                {opType === OpType.View ? (
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setOpType?.(OpType.Edit);
                    }}
                  >
                    {buttonLabel}
                  </Button>
                ) : (
                  <LoadingButton
                    type="submit"
                    form={formId}
                    disabled={isLoading}
                    className={"bg-primary"}
                    isLoading={isSubmitting ?? (isUpdating || isCreating)}
                  >
                    {buttonLabel}
                  </LoadingButton>
                )}
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved-changes warning — shown when user tries to close a dirty form */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you close now, your changes will be
              lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowWarning(false)}>
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowWarning(false);
                setIsFormDirty(false);
                closeForm();
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
