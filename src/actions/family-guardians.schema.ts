import { z } from "zod";

import { phoneSchema } from "@/actions/validation.schema";

export const familyGuardianSchema = z.object({
  name: z.string().trim().min(1, "Guardian name is required").max(150),
  relationship: z.string().trim().max(80).or(z.literal("")).optional(),
  email: z.email("Enter a valid email").trim().toLowerCase().or(z.literal("")).optional(),
  phone: phoneSchema.or(z.literal("")).optional(),
});

export type FamilyGuardianInput = z.infer<typeof familyGuardianSchema>;
