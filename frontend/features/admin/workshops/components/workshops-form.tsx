"use client";

import { FormDialog } from "@/components/shared/forms/form-dialog";
import { UseFormReturn } from "react-hook-form";
import { useRef } from "react";
import { OpType } from "@/constants/common";
import { useFormCrudContext } from "@/context/form-crud.context";
import { FormInput } from "@/components/shared/forms/form-input";
import { FormSelect } from "@/components/shared/forms/form-select";
import { WorkshopSchema, WorkshopFormData } from "@/features/admin/workshops/schemas/workshop-schema";
import { Workshop } from "@/features/admin/workshops/types/workshops-types";
import type { ApiError } from "@/lib/api-client";

const WorkshopForm = () => {
  const { opType, selectedItem, handleEdit, handleCreate } =
    useFormCrudContext<Workshop>();
  const { id } = selectedItem || {};
  const formRef = useRef<UseFormReturn<WorkshopFormData>>(null);

  const isEdit = opType === OpType.Edit;
  const currentStatus = selectedItem?.status;

  // Allowed transitions:
  // - draft -> open | cancelled
  // - open -> cancelled | completed
  // - cancelled/completed final = read-only
  let statusOptions = [
    { label: "Draft", value: "draft" },
    { label: "Open", value: "open" },
  ];

  let isStatusDisabled = false;

  if (isEdit) {
    if (currentStatus === "draft") {
      statusOptions = [
        { label: "Draft", value: "draft" },
        { label: "Open", value: "open" },
        { label: "Cancelled", value: "cancelled" },
      ];
    } else if (currentStatus === "open") {
      statusOptions = [
        { label: "Open", value: "open" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Completed", value: "completed" },
      ];
    } else if (currentStatus === "cancelled") {
      statusOptions = [{ label: "Cancelled (Final)", value: "cancelled" }];
      isStatusDisabled = true;
    } else if (currentStatus === "completed") {
      statusOptions = [{ label: "Completed (Final)", value: "completed" }];
      isStatusDisabled = true;
    }
  }

  const onSubmit = async (data: WorkshopFormData) => {
    // Format dates to ISO strings if needed
    const startsAtIso = data.starts_at ? new Date(data.starts_at).toISOString() : "";
    const endsAtIso = data.ends_at ? new Date(data.ends_at).toISOString() : null;

    try {
      if (id && opType === OpType.Edit) {
        const updatePayload: Partial<Workshop> = {
          title: data.title,
          instructor: data.instructor,
          starts_at: startsAtIso,
          ends_at: endsAtIso,
          location: data.location || null,
          description: data.description || null,
          capacity: Number(data.capacity),
          status: data.status,
        };
        await handleEdit?.({ id, ...updatePayload });
      } else {
        const createPayload: Partial<Workshop> = {
          code: data.code.toUpperCase().trim(),
          title: data.title,
          instructor: data.instructor,
          starts_at: startsAtIso,
          ends_at: endsAtIso,
          location: data.location || null,
          description: data.description || null,
          capacity: Number(data.capacity),
          status: data.status,
        };
        await handleCreate?.(createPayload);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError | undefined;
      if (apiErr?.errors) {
        Object.entries(apiErr.errors).forEach(([field, msgs]) => {
          formRef.current?.setError(field as keyof WorkshopFormData, {
            type: "server",
            message: msgs?.[0],
          });
        });
      }
    }
  };

  const activeCount = selectedItem?.active_count ?? 0;

  return (
    <FormDialog
      formRef={formRef}
      schema={WorkshopSchema}
      onSubmit={onSubmit}
      title={{
        create: "Create New Workshop",
        edit: "Edit Workshop",
        view: "Workshop Details",
      }}
      buttonTitle={{
        create: "Create Workshop",
        edit: "Save Changes",
        view: "Edit",
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          name="code"
          label="Code *"
          placeholder="e.g. FIT-2026-01"
          disabled={isEdit}
        />

        <div className="flex flex-col">
          <FormInput
            name="capacity"
            label="Capacity (Seats) *"
            placeholder="e.g. 20"
            type="number"
          />
          {isEdit && (
            <span className="text-[11px] text-muted-foreground mt-1">
              {activeCount} attendees already registered
            </span>
          )}
        </div>
      </div>

      <FormInput
        name="title"
        label="Title *"
        placeholder="e.g. Morning Yoga & Mindfulness"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          name="instructor"
          label="Instructor *"
          placeholder="e.g. Priya Sharma"
        />

        <FormSelect
          name="status"
          label="Status *"
          options={statusOptions}
          disabled={isStatusDisabled}
          placeholder="Select status"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          name="starts_at"
          label="Starts At *"
          type="datetime-local"
        />

        <FormInput
          name="ends_at"
          label="Ends At"
          type="datetime-local"
        />
      </div>

      <FormInput
        name="location"
        label="Location"
        placeholder="e.g. Wellness Centre, Studio A"
      />

      <FormInput
        name="description"
        label="Description"
        placeholder="Brief description of the workshop"
      />
    </FormDialog>
  );
};

export default WorkshopForm;
