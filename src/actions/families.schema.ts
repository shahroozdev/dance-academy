import { z } from "zod";

export const familyCreateSchema = z.object({
  familyName: z.string().min(1, "Family name is required"),
  parentGuardianName: z.string().min(1, "Parent/guardian name is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().min(1, "Phone number is required"),
  notes: z.string().or(z.literal("")).optional(),
});

export const familyUpdateSchema = familyCreateSchema.partial();

export type FamilyCreateInput = z.infer<typeof familyCreateSchema>;
export type FamilyUpdateInput = z.infer<typeof familyUpdateSchema>;
