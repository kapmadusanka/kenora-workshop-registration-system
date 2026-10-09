import { z } from "zod";

export const RegistrationSchema = z.object({
  attendee_name: z
    .string()
    .trim()
    .min(1, "Attendee name is required")
    .max(255, "Name is too long"),
  attendee_email: z
    .string()
    .trim()
    .min(1, "Attendee email is required")
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
});

export type RegistrationFormData = z.infer<typeof RegistrationSchema>;

export const CancelRegistrationSchema = z.object({
  reason: z
    .string()
    .max(255, "Reason cannot exceed 255 characters")
    .optional(),
});

export type CancelRegistrationFormData = z.infer<typeof CancelRegistrationSchema>;
