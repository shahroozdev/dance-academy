import { z } from "zod";

import { phoneSchema } from "@/actions/validation.schema";

export const familyCreateSchema = z.object({
  familyName: z.string().min(1, "Family name is required"),
  parentGuardianName: z.string().min(1, "Parent/guardian name is required"),
  email: z.email("Invalid email").trim().toLowerCase().or(z.literal("")).optional(),
  phone: phoneSchema,
  notes: z.string().or(z.literal("")).optional(),
});

export const familyUpdateSchema = familyCreateSchema.partial();

export type FamilyCreateInput = z.infer<typeof familyCreateSchema>;
export type FamilyUpdateInput = z.infer<typeof familyUpdateSchema>;
