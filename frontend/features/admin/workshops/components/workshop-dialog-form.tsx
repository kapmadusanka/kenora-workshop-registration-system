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
import { Textarea } from "@/components/core/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/core/Button";
import { LoadingButton } from "@/components/core/loading-button";
import { formatDateTimeLocal } from "@/lib/format";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import type { Workshop } from "../types/workshops-types";
import type { ApiError } from "@/lib/api-client";

export type WorkshopFormValues = {
  code: string;
  title: string;
  instructor: string;
  capacity: number;
  status: "draft" | "open" | "cancelled" | "completed";
  starts_at: string;
  ends_at?: string;
  location?: string;
  description?: string;
};

export interface WorkshopDialogFormProps {
  open: boolean;
  onClose: () => void;
  workshop: Workshop | null; // null for Create, Workshop for Edit
  onSuccess: () => void;
}

export function WorkshopDialogForm({
  open,
  onClose,
  workshop,
  onSuccess,
}: WorkshopDialogFormProps) {
  const isEdit = Boolean(workshop);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const activeCount = workshop?.active_count ?? 0;
  const currentStatus = workshop?.status;

  // Status options logic according to business rules:
  // - create: draft, open
  // - edit:
  //   - draft -> draft, open, cancelled
  //   - open -> open, cancelled, completed
  //   - cancelled / completed -> final (disabled)
  const isStatusLocked = isEdit && (currentStatus === "cancelled" || currentStatus === "completed");

  const statusOptions = React.useMemo(() => {
    if (!isEdit) {
      return [
        { label: "Draft", value: "draft" },
        { label: "Open", value: "open" },
      ];
    }

    if (currentStatus === "draft") {
      return [
        { label: "Draft", value: "draft" },
        { label: "Open", value: "open" },
        { label: "Cancelled", value: "cancelled" },
      ];
    }

    if (currentStatus === "open") {
      return [
        { label: "Open", value: "open" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Completed", value: "completed" },
      ];
    }

    if (currentStatus === "cancelled") {
      return [{ label: "Cancelled (Final)", value: "cancelled" }];
    }

    if (currentStatus === "completed") {
      return [{ label: "Completed (Final)", value: "completed" }];
    }

    return [{ label: "Open", value: "open" }];
  }, [isEdit, currentStatus]);

  const schema = React.useMemo(() => {
    return z
      .object({
        code: z
          .string()
          .trim()
          .min(1, "Code is required")
          .max(30, "Code cannot exceed 30 characters"),
        title: z
          .string()
          .trim()
          .min(2, "Title must be at least 2 characters")
          .max(255, "Title cannot exceed 255 characters"),
        instructor: z
          .string()
          .trim()
          .min(2, "Instructor must be at least 2 characters")
          .max(255, "Instructor cannot exceed 255 characters"),
        capacity: z.coerce
          .number()
          .int("Capacity must be a whole number")
          .min(1, "Capacity must be at least 1 seat")
          .max(1000, "Capacity cannot exceed 1000 seats"),
        status: z.enum(["draft", "open", "cancelled", "completed"], {
          errorMap: () => ({ message: "Please select a valid status" }),
        }),
        starts_at: z.string().min(1, "Start date and time is required"),
        ends_at: z.string().optional(),
        location: z.string().trim().max(255, "Location cannot exceed 255 characters").optional(),
        description: z.string().trim().max(5000, "Description cannot exceed 5000 characters").optional(),
      })
      .superRefine((data, ctx) => {
        // In edit mode, capacity cannot be lower than active registered attendees
        if (isEdit && data.capacity < activeCount) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["capacity"],
            message: `Capacity cannot be lower than the ${activeCount} attendees already registered`,
          });
        }

        // Validate ends_at > starts_at
        if (data.starts_at && data.ends_at) {
          const start = new Date(data.starts_at).getTime();
          const end = new Date(data.ends_at).getTime();
          if (!isNaN(start) && !isNaN(end) && end <= start) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["ends_at"],
              message: "End time must be after start time",
            });
          }
        }
      });
  }, [isEdit, activeCount]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<WorkshopFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      title: "",
      instructor: "",
      capacity: 20,
      status: "draft",
      starts_at: "",
      ends_at: "",
      location: "",
      description: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      if (workshop) {
        reset({
          code: workshop.code,
          title: workshop.title,
          instructor: workshop.instructor,
          capacity: workshop.capacity,
          status: workshop.status as WorkshopFormValues["status"],
          starts_at: formatDateTimeLocal(workshop.starts_at),
          ends_at: workshop.ends_at ? formatDateTimeLocal(workshop.ends_at) : "",
          location: workshop.location ?? "",
          description: workshop.description ?? "",
        });
      } else {
        reset({
          code: "",
          title: "",
          instructor: "",
          capacity: 20,
          status: "draft",
          starts_at: "",
          ends_at: "",
          location: "",
          description: "",
        });
      }
    }
  }, [open, workshop, reset]);

  const onSubmit = async (data: WorkshopFormValues) => {
    setIsSubmitting(true);
    try {
      const startsAtIso = data.starts_at ? new Date(data.starts_at).toISOString() : "";
      const endsAtIso = data.ends_at ? new Date(data.ends_at).toISOString() : null;

      if (isEdit && workshop) {
        // On update, we send only mutable fields (excluding immutable code)
        const updatePayload = {
          title: data.title.trim(),
          instructor: data.instructor.trim(),
          capacity: Number(data.capacity),
          status: data.status,
          starts_at: startsAtIso,
          ends_at: endsAtIso,
          location: data.location?.trim() || null,
          description: data.description?.trim() || null,
        };

        await apiClient.patch(`/workshops/${workshop.id}`, updatePayload);
        toast.success("Workshop updated successfully");
      } else {
        // On create, code is mandatory and upper-cased
        const createPayload = {
          code: data.code.toUpperCase().trim(),
          title: data.title.trim(),
          instructor: data.instructor.trim(),
          capacity: Number(data.capacity),
          status: data.status,
          starts_at: startsAtIso,
          ends_at: endsAtIso,
          location: data.location?.trim() || null,
          description: data.description?.trim() || null,
        };

        await apiClient.post("/workshops", createPayload);
        toast.success("Workshop created successfully");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError | undefined;
      const errorsMap = apiErr?.errors;

      if (errorsMap) {
        Object.entries(errorsMap).forEach(([field, msgs]) => {
          if (msgs && msgs.length > 0) {
            setError(field as keyof WorkshopFormValues, {
              type: "server",
              message: msgs[0],
            });
          }
        });
      } else {
        toast.error(apiErr?.message || "Failed to save workshop. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            {isEdit ? "Edit Workshop" : "Schedule New Workshop"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Workshop Code"
              htmlFor="code"
              required={!isEdit}
              error={errors.code?.message}
            >
              <Input
                id="code"
                placeholder="e.g. FIT-2026-01"
                disabled={isEdit || isSubmitting}
                className={isEdit ? "bg-muted font-mono" : "font-mono uppercase"}
                {...register("code")}
              />
              {isEdit && (
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Workshop code is permanent and cannot be modified.
                </span>
              )}
            </FormField>

            <FormField
              label="Capacity (Seats)"
              htmlFor="capacity"
              required
              error={errors.capacity?.message}
            >
              <Input
                id="capacity"
                type="number"
                min={isEdit ? activeCount : 1}
                max={1000}
                placeholder="e.g. 25"
                disabled={isSubmitting}
                {...register("capacity")}
              />
              {isEdit && (
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  {activeCount} attendees currently registered (cannot reduce below {activeCount}).
                </span>
              )}
            </FormField>
          </div>

          <FormField
            label="Workshop Title"
            htmlFor="title"
            required
            error={errors.title?.message}
          >
            <Input
              id="title"
              placeholder="e.g. Advanced TypeScript Patterns"
              disabled={isSubmitting}
              {...register("title")}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Instructor"
              htmlFor="instructor"
              required
              error={errors.instructor?.message}
            >
              <Input
                id="instructor"
                placeholder="e.g. Jane Doe"
                disabled={isSubmitting}
                {...register("instructor")}
              />
            </FormField>

            <FormField
              label="Status"
              htmlFor="status"
              required
              error={errors.status?.message}
            >
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isStatusLocked || isSubmitting}
                  >
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {isStatusLocked && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block">
                  Status is in final state ({currentStatus}) and cannot be changed.
                </span>
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Start Date & Time"
              htmlFor="starts_at"
              required
              error={errors.starts_at?.message}
            >
              <Input
                id="starts_at"
                type="datetime-local"
                disabled={isSubmitting}
                {...register("starts_at")}
              />
            </FormField>

            <FormField
              label="End Date & Time"
              htmlFor="ends_at"
              error={errors.ends_at?.message}
            >
              <Input
                id="ends_at"
                type="datetime-local"
                disabled={isSubmitting}
                {...register("ends_at")}
              />
            </FormField>
          </div>

          <FormField
            label="Location / Room"
            htmlFor="location"
            error={errors.location?.message}
          >
            <Input
              id="location"
              placeholder="e.g. Innovation Hall, Room B12 (or Online link)"
              disabled={isSubmitting}
              {...register("location")}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="description"
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              rows={3}
              placeholder="Outline what attendees will learn in this session..."
              disabled={isSubmitting}
              {...register("description")}
            />
          </FormField>

          <DialogFooter className="pt-4 flex items-center justify-end gap-3 border-t">
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]"
              isLoading={isSubmitting}
            >
              {isEdit ? "Save Changes" : "Create Workshop"}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
