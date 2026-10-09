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

const statusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Open", value: "open" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Completed", value: "completed" },
];

const WorkshopForm = () => {
  const { opType, selectedItem, handleEdit, handleCreate } =
    useFormCrudContext<Workshop>();
  const { id } = selectedItem || {};
  const formRef = useRef<UseFormReturn<WorkshopFormData>>(null);

  const onSubmit = async (data: WorkshopFormData) => {
    // Format dates to ISO strings if needed
    const startsAtIso = data.starts_at ? new Date(data.starts_at).toISOString() : "";
    const endsAtIso = data.ends_at ? new Date(data.ends_at).toISOString() : null;

    if (id && opType === OpType.Edit) {
      // In edit mode: backend ignores or rejects code change, so omit code or send unchanged
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
      handleEdit?.({ id, ...updatePayload });
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
      handleCreate?.(createPayload);
    }
  };

  const isEdit = opType === OpType.Edit;

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

        <FormInput
          name="capacity"
          label="Capacity (Seats) *"
          placeholder="e.g. 20"
          type="number"
        />
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
