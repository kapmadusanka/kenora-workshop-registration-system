import {z} from "zod";
import {WorkshopSchema} from "@/features/admin/workshops/schemas/workshop-schema";

export type Workshop = z.infer<typeof WorkshopSchema>;
