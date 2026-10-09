import { z } from "zod";
import { WorkshopSchema } from "@/features/admin/workshops/schemas/workshop-schema";
import type { Workshop as DomainWorkshop, WorkshopStatus as DomainWorkshopStatus } from "@/types";

export type Workshop = DomainWorkshop;
export type WorkshopStatus = DomainWorkshopStatus;
export type WorkshopFormValues = z.infer<typeof WorkshopSchema>;
