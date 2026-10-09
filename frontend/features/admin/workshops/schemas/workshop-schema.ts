import {z} from "zod";

export const WorkshopSchema = z.object({
    id: z.string().optional(),
    name: z
        .string()
        .trim()
        .min(2, "Workshop name must be at least 2 characters")
        .max(100, "Workshop name cannot exceed 100 characters"),
    description: z
        .string()
        .trim()
        .max(500, "Description cannot exceed 500 characters")
        .nullable()
        .optional(),
    isActive: z.boolean().default(true).optional(),
});
