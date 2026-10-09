import { z } from "zod";

export const CreateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "manager", "staff"], {
    errorMap: () => ({ message: "Please select a valid role" }),
  }),
  is_active: z.boolean().default(true),
});

export type CreateUserFormData = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  role: z.enum(["admin", "manager", "staff"], {
    errorMap: () => ({ message: "Please select a valid role" }),
  }),
  is_active: z.boolean().default(true),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 8, {
      message: "Password must be at least 8 characters if resetting",
    }),
});

export type UpdateUserFormData = z.infer<typeof UpdateUserSchema>;
