"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";
import { z } from "zod";
import { FormField } from "@/components/core/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/core/Textarea";
import { Button } from "@/components/core/Button";
import { LoadingButton } from "@/components/core/loading-button";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import type { ApiError } from "@/lib/api-client";

const CreateWorkshopSchema = z.object({
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
  starts_at: z.string().min(1, "Start date and time is required"),
  ends_at: z.string().optional(),
  location: z.string().trim().max(255).optional(),
  description: z.string().trim().max(5000).optional(),
  capacity: z.coerce
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1 seat")
    .max(1000, "Capacity cannot exceed 1000 seats"),
  status: z.enum(["draft", "open"]),
});

type CreateWorkshopFormData = z.infer<typeof CreateWorkshopSchema>;

export function CreateWorkshopView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateWorkshopFormData>({
    resolver: zodResolver(CreateWorkshopSchema),
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

  const onSubmit = async (data: CreateWorkshopFormData) => {
    setIsSubmitting(true);
    try {
      const startsAtIso = data.starts_at ? new Date(data.starts_at).toISOString() : "";
      const endsAtIso = data.ends_at ? new Date(data.ends_at).toISOString() : null;

      const payload = {
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

      await apiClient.post("/workshops", payload);

      toast.success("Workshop created successfully");
      await queryClient.invalidateQueries({ queryKey: ["workshops"] });
      await queryClient.invalidateQueries({ queryKey: ["workshops-list"] });
      router.push("/workshops");
    } catch (err: unknown) {
      const apiErr = err as ApiError | undefined;
      if (apiErr?.errors) {
        Object.entries(apiErr.errors).forEach(([field, msgs]) => {
          setError(field as keyof CreateWorkshopFormData, {
            type: "server",
            message: msgs?.[0],
          });
        });
      } else {
        toast.error(apiErr?.message || "Failed to create workshop");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Link href="/workshops">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl" title="Back to workshops">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">New Workshop</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Schedule a new workshop and configure attendee capacity
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Workshop Code" htmlFor="code" required error={errors.code?.message}>
              <Input
                id="code"
                placeholder="e.g. WKP-2026-01"
                className="font-mono uppercase"
                disabled={isSubmitting}
                {...register("code")}
              />
            </FormField>

            <FormField label="Capacity (Seats)" htmlFor="capacity" required error={errors.capacity?.message}>
              <Input
                id="capacity"
                type="number"
                placeholder="e.g. 20"
                disabled={isSubmitting}
                {...register("capacity")}
              />
            </FormField>
          </div>

          <FormField label="Title" htmlFor="title" required error={errors.title?.message}>
            <Input
              id="title"
              placeholder="e.g. Introduction to Pottery & Ceramics"
              disabled={isSubmitting}
              {...register("title")}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Instructor" htmlFor="instructor" required error={errors.instructor?.message}>
              <Input
                id="instructor"
                placeholder="e.g. Elena Rostova"
                disabled={isSubmitting}
                {...register("instructor")}
              />
            </FormField>

            <FormField label="Status" htmlFor="status" required error={errors.status?.message}>
              <select
                id="status"
                disabled={isSubmitting}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                {...register("status")}
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Starts At" htmlFor="starts_at" required error={errors.starts_at?.message}>
              <Input
                id="starts_at"
                type="datetime-local"
                disabled={isSubmitting}
                {...register("starts_at")}
              />
            </FormField>

            <FormField label="Ends At" htmlFor="ends_at" error={errors.ends_at?.message}>
              <Input
                id="ends_at"
                type="datetime-local"
                disabled={isSubmitting}
                {...register("ends_at")}
              />
            </FormField>
          </div>

          <FormField label="Location" htmlFor="location" error={errors.location?.message}>
            <Input
              id="location"
              placeholder="e.g. Community Centre Room 2"
              disabled={isSubmitting}
              {...register("location")}
            />
          </FormField>

          <FormField label="Description" htmlFor="description" error={errors.description?.message}>
            <Textarea
              id="description"
              rows={3}
              placeholder="Brief description of the workshop content and prerequisites"
              disabled={isSubmitting}
              {...register("description")}
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
            <Link href="/workshops">
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <LoadingButton
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              isLoadingText="Creating..."
              className="px-6"
            >
              Create Workshop
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
