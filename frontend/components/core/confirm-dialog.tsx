"use client";

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReactNode } from "react";
import {Button, customButtonVariants} from "@/components/core/Button";
import { LoadingButton } from "@/components/core/loading-button";

export type ConfirmDialogProps = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    description?: string | ReactNode;
    confirmText?: string;
    cancelText?: string;
    cancelButtonVariant?: string;
    confirmButtonVariant:
        | "tertiary"
        | "primary"
        | "secondary"
        | "dangerPrimary"
        | "dangerSecondary"
        | "ghost"
        | "nonStatePrimary"
        | "nonStateSecondary"
        | "outline"
        | "outlineDanger"
        | null
        | undefined;
    isLoading?: boolean;
    confirmClassName?: string;
};

export function ConfirmDialog({
                                  open,
                                  onClose,
                                  onConfirm,
                                  title,
                                  description,
                                  confirmText = "Confirm",
                                  cancelText = "Cancel",
                                  cancelButtonVariant = "outline",
                                  confirmButtonVariant,
                                  isLoading = false,
                                  confirmClassName = "",
                              }: ConfirmDialogProps) {
    const confirmStyles = {
        default: "bg-primary hover:bg-primary/90",
        danger: "bg-red-600 hover:bg-red-700",
        warning: "bg-yellow-500 hover:bg-yellow-600 text-black",
    };

    return (
        <AlertDialog open={open} onOpenChange={onClose}>
            <AlertDialogContent className="sm:max-w-lg max-w-xs p-4 sm:p-6">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-semibold">
                        {title}
                    </AlertDialogTitle>

                    {description && (
                        <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                            {description}
                        </AlertDialogDescription>
                    )}
                </AlertDialogHeader>

                <AlertDialogFooter className="gap-2">
                    <Button
                        variant={cancelButtonVariant as "outline"}
                        disabled={isLoading}
                        onClick={onClose}
                    >
                        {cancelText}
                    </Button>
                    <LoadingButton
                        variant={confirmButtonVariant}
                        isLoading={isLoading}
                        onClick={onConfirm}
                        className={confirmClassName}
                    >
                        {confirmText}
                    </LoadingButton>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
