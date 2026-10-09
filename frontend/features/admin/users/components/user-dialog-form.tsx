"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FormField } from "@/components/core/FormField";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/core/PasswordInput";
import { Switch } from "@/components/core/Switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/core/Button";
import { LoadingButton } from "@/components/core/loading-button";
import { ConfirmDialog } from "@/components/core/confirm-dialog";
import { Tooltip } from "@/components/core/Tooltip";
import { userMessages } from "@/lib/messages";
import type { User, Role } from "@/features/admin/users/types";
import { createUser, updateUser } from "@/features/admin/users/api";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import type { ApiError } from "@/lib/api-client";
import { ShieldAlert } from "lucide-react";

export type UserFormValues = {
  name: string;
  email: string;
  password?: string;
  role: Role;
  is_active: boolean;
};

export interface UserDialogFormProps {
  open: boolean;
  onClose: () => void;
  user: User | null; // null for Create, User for Edit
  onSuccess: () => void;
}

export function UserDialogForm({
  open,
  onClose,
  user,
  onSuccess,
}: UserDialogFormProps) {
  const { data: session } = useSession();
  const isEdit = Boolean(user);
  const isSelf = Boolean(user && session?.user && Number(session.user.id) === user.id);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<UserFormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const schema = React.useMemo(() => {
    return z
      .object({
        name: z.string().trim().min(1, "Name is required").max(255),
        email: z.string(),
        password: z.string().optional(),
        role: z.enum(["admin", "manager", "staff"], {
          errorMap: () => ({ message: "Please select a valid role" }),
        }),
        is_active: z.boolean(),
      })
      .superRefine((data, ctx) => {
        if (!isEdit) {
          if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["email"],
              message: "Please enter a valid email address",
            });
          }
          if (!data.password || data.password.length < 8) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["password"],
              message: "Password must be at least 8 characters",
            });
          }
        } else {
          if (data.password && data.password.length > 0 && data.password.length < 8) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["password"],
              message: "Password must be at least 8 characters if resetting",
            });
          }
        }
      });
  }, [isEdit]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "staff",
      is_active: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      if (user) {
        reset({
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          password: "",
        });
      } else {
        reset({
          name: "",
          email: "",
          password: "",
          role: "staff",
          is_active: true,
        });
      }
    }
  }, [open, user, reset]);

  const executeSave = async (data: UserFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEdit && user) {
        await updateUser(user.id, {
          name: data.name,
          role: data.role,
          is_active: data.is_active,
          password: data.password || undefined,
        });
        toast.success(userMessages.updated_success);
      } else {
        await createUser({
          name: data.name,
          email: data.email,
          role: data.role,
          is_active: data.is_active,
          password: data.password ?? "",
        });
        toast.success(userMessages.created_success);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError | undefined;
      const errorsMap = apiErr?.errors;

      if (errorsMap) {
        Object.entries(errorsMap).forEach(([field, msgs]) => {
          if (field === "user") {
            toast.error(msgs?.[0] || "Cannot modify this administrator account.");
          } else {
            setError(field as keyof UserFormValues, {
              type: "server",
              message: msgs?.[0] || "Invalid value",
            });
          }
        });
      } else {
        toast.error(apiErr?.message || "Failed to save user account.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (data: UserFormValues) => {
    // If editing: check if role changed or user is being deactivated
    if (isEdit && user) {
      const roleChanged = data.role !== user.role;
      const deactivating = user.is_active && !data.is_active;

      if (roleChanged || deactivating) {
        setPendingValues(data);
        setConfirmOpen(true);
        return;
      }
    }

    void executeSave(data);
  };

  const handleConfirmAction = async () => {
    setConfirmOpen(false);
    if (pendingValues) {
      await executeSave(pendingValues);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {isEdit ? "Edit User Account" : "Create User Account"}
            </DialogTitle>
          </DialogHeader>

          {isSelf && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900 text-xs">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>You are editing your own account. Role and active status are locked.</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField label="Full Name" htmlFor="name" required error={errors.name?.message}>
              <Input
                id="name"
                placeholder="e.g. Alex Morgan"
                disabled={isSubmitting}
                {...register("name")}
              />
            </FormField>

            <FormField
              label="Email Address"
              htmlFor="email"
              required={!isEdit}
              error={errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                placeholder="e.g. alex.morgan@centre.org"
                disabled={isEdit || isSubmitting}
                className={isEdit ? "bg-muted cursor-not-allowed" : ""}
                {...register("email")}
              />
              {isEdit && (
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  Email addresses cannot be changed after creation.
                </span>
              )}
            </FormField>

            <FormField
              label={isEdit ? "Reset Password (optional)" : "Password"}
              htmlFor="password"
              required={!isEdit}
              error={errors.password?.message}
              description={
                isEdit
                  ? "Leave blank to keep existing password."
                  : userMessages.password_hint
              }
            >
              <PasswordInput
                id="password"
                placeholder={isEdit ? "Leave blank to keep unchanged" : "At least 8 characters"}
                disabled={isSubmitting}
                {...register("password")}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <FormField label="Role" htmlFor="role" required error={errors.role?.message}>
                    <Tooltip
                      content={userMessages.self_edit_forbidden}
                      enabled={isSelf}
                    >
                      <div>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isSelf || isSubmitting}
                        >
                          <SelectTrigger id="role" className="w-full">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="manager">Programme Manager</SelectItem>
                            <SelectItem value="staff">Front Desk Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </Tooltip>
                  </FormField>
                )}
              />

              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <FormField label="Account Status" htmlFor="is_active">
                    <Tooltip
                      content={userMessages.self_edit_forbidden}
                      enabled={isSelf}
                    >
                      <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-border/80 bg-background">
                        <span className="text-xs font-semibold">
                          {field.value ? "Active" : "Deactivated"}
                        </span>
                        <Switch
                          id="is_active"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSelf || isSubmitting}
                        />
                      </div>
                    </Tooltip>
                  </FormField>
                )}
              />
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={onClose}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                isLoadingText="Saving..."
                className={"bg-primary"}
              >
                {isEdit ? "Save Changes" : "Create User"}
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmAction}
        title="Confirm User Account Modification"
        description="Changing a user's role or deactivating their account will immediately invalidate their active authentication tokens and sign out all of their active sessions. Do you wish to proceed?"
        confirmText="Proceed"
        confirmButtonVariant="primary"
      />
    </>
  );
}
