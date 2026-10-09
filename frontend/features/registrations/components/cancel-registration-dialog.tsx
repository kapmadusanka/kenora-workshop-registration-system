"use client";

import * as React from "react";
import { ConfirmDialog } from "@/components/core/confirm-dialog";
import { Textarea } from "@/components/core/Textarea";
import { FormField } from "@/components/core/FormField";
import { registrationMessages } from "@/lib/messages";
import type { Registration } from "@/features/registrations/types";
import { toast } from "sonner";
import { useCancelRegistration } from "@/features/registrations/hooks";
import type { ApiError } from "@/lib/api-client";

export interface CancelRegistrationDialogProps {
  workshopId: string | number;
  registration: Registration | null;
  open: boolean;
  onClose: () => void;
}

export function CancelRegistrationDialog({
  workshopId,
  registration,
  open,
  onClose,
}: CancelRegistrationDialogProps) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const cancelMutation = useCancelRegistration(workshopId);

  const handleClose = () => {
    setReason("");
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!registration) return;

    if (reason.length > 255) {
      setError("Cancellation reason cannot exceed 255 characters.");
      return;
    }

    try {
      await cancelMutation.mutateAsync({
        registrationId: registration.id,
        reason: reason.trim() || undefined,
      });

      toast.success(registrationMessages.cancelled_success);
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError | undefined;
      const code = apiErr?.code;

      if (code === "already_cancelled") {
        toast.error(registrationMessages.already_cancelled);
        handleClose();
      } else if (apiErr?.statusCode === 403) {
        toast.error(registrationMessages.forbidden);
      } else {
        toast.error(apiErr?.message || "Failed to cancel registration");
      }
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={registrationMessages.confirm_cancel_title}
      confirmText="Cancel Registration"
      confirmButtonVariant="dangerPrimary"
      isLoading={cancelMutation.isPending}
      confirmClassName={' bg-primary'}
      description={
        <div className="space-y-3.5 pt-1">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel the registration for{" "}
            <span className="font-semibold text-foreground">
              {registration?.attendee_name}
            </span>{" "}
            ({registration?.attendee_email})? The seat will be freed immediately, but the
            record remains permanently in history.
          </p>

          <FormField
            label="Cancellation Reason (optional)"
            htmlFor="cancel_reason"
            error={error ?? undefined}
          >
            <Textarea
              id="cancel_reason"
              placeholder="e.g. Attendee requested cancellation due to scheduling conflict..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.length > 255) {
                  setError("Cancellation reason cannot exceed 255 characters.");
                } else {
                  setError(null);
                }
              }}
              rows={3}
              maxLength={255}
              disabled={cancelMutation.isPending}
            />
            <div className="flex justify-end text-[11px] text-muted-foreground">
              {reason.length}/255
            </div>
          </FormField>
        </div>
      }
    />
  );
}
