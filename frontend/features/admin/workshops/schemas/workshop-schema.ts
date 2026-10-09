import { z } from "zod";

export const WorkshopSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
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
  ends_at: z.string().nullable().optional(),
  location: z
    .string()
    .trim()
    .max(255, "Location cannot exceed 255 characters")
    .nullable()
    .optional(),
  description: z
    .string()
    .trim()
    .max(5000, "Description cannot exceed 5000 characters")
    .nullable()
    .optional(),
  capacity: z.coerce
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1 seat")
    .max(1000, "Capacity cannot exceed 1000 seats"),
  status: z.enum(["draft", "open", "cancelled", "completed"]).default("draft"),
  active_count: z.number().optional(),
  seats_left: z.number().optional(),
  is_full: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type WorkshopFormData = z.infer<typeof WorkshopSchema>;
