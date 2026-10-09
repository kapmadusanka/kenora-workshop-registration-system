"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  RegistrationSchema,
  type RegistrationFormData,
} from "@/lib/schemas/registration-schema";
import { useRegisterAttendee } from "@/features/registrations/hooks";
import { FormField } from "@/components/core/FormField";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/core/loading-button";
import { registrationMessages } from "@/lib/messages";
import type { Workshop } from "@/features/registrations/types";
import { UserPlus, AlertCircle, Lock } from "lucide-react";
import type { ApiError } from "@/lib/api-client";

export interface RegisterFormProps {
  workshop: Workshop;
  refetchWorkshop: () => Promise<unknown> | void;
}

export function RegisterForm({ workshop, refetchWorkshop }: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(RegistrationSchema),
    defaultValues: {
      attendee_name: "",
      attendee_email: "",
    },
  });

  const registerMutation = useRegisterAttendee(workshop.id);

  const isOpen = workshop.status === "open";
  const isFull = Boolean(workshop.is_full);
  const isRegistrationAllowed = isOpen && !isFull;

  const disabledReason = !isOpen
    ? registrationMessages.closed_workshop_disabled
    : isFull
    ? registrationMessages.full_workshop_disabled
    : null;

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      await registerMutation.mutateAsync({
        attendee_name: data.attendee_name.trim(),
        attendee_email: data.attendee_email.trim().toLowerCase(),
      });

      toast.success(registrationMessages.registered_success);
      reset({ attendee_name: "", attendee_email: "" });
      setFocus("attendee_name");
    } catch (err: unknown) {
      const apiErr = err as ApiError | undefined;
      const code = apiErr?.code;
      const status = apiErr?.statusCode;

      if (code === "workshop_full") {
        toast.error(registrationMessages.workshop_full);
        void refetchWorkshop();
        // keep form values
      } else if (code === "workshop_not_open") {
        toast.error(apiErr?.message || registrationMessages.workshop_not_open);
        void refetchWorkshop();
      } else if (code === "duplicate_registration") {
        setError("attendee_email", {
          type: "manual",
          message: registrationMessages.duplicate_registration,
        });
      } else if (code === "already_cancelled") {
        toast.error(registrationMessages.already_cancelled);
      } else if (status === 403) {
        toast.error(registrationMessages.forbidden);
      } else if (status === 422 && apiErr?.errors) {
        Object.entries(apiErr.errors).forEach(([field, msgs]) => {
          if (field === "attendee_name" || field === "attendee_email") {
            setError(field, {
              type: "server",
              message: msgs?.[0] || "Invalid value",
            });
          } else {
            toast.error(msgs?.[0] || "Validation failed");
          }
        });
      } else {
        toast.error(apiErr?.message || "An unexpected error occurred");
      }
    }
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">Register Attendee</h2>
      </div>

      {!isRegistrationAllowed && disabledReason && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900 text-xs font-semibold">
          {isFull ? <Lock className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{disabledReason}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Attendee Name"
            htmlFor="attendee_name"
            required
            error={errors.attendee_name?.message}
          >
            <Input
              id="attendee_name"
              placeholder="e.g. Jane Doe"
              disabled={!isRegistrationAllowed || registerMutation.isPending}
              {...register("attendee_name")}
            />
          </FormField>

          <FormField
            label="Attendee Email"
            htmlFor="attendee_email"
            required
            error={errors.attendee_email?.message}
          >
            <Input
              id="attendee_email"
              type="email"
              placeholder="e.g. jane.doe@example.com"
              disabled={!isRegistrationAllowed || registerMutation.isPending}
              {...register("attendee_email")}
            />
          </FormField>
        </div>

        <div className="flex items-center justify-end pt-1">
          <LoadingButton
            type="submit"
            variant="primary"
            isLoading={registerMutation.isPending}
            isLoadingText="Registering..."
            disabled={!isRegistrationAllowed || registerMutation.isPending}
            className="w-full sm:w-auto px-6 bg-primary"
          >
            Register Attendee
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}
