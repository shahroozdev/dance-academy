import { z } from "zod";

export const classExtraSessionSchema = z.object({
  classId: z.string().min(1),
  sessionDate: z.iso.date("Enter a valid rehearsal date"),
  title: z.string().trim().min(1, "Enter a name for this session").max(100),
  billingUnit: z.enum(["SESSION", "HOUR"]),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  rate: z.coerce.number().nonnegative("Rate cannot be negative"),
  notes: z.string().trim().max(500).or(z.literal("")).optional(),
});

export type ClassExtraSessionInput = z.infer<typeof classExtraSessionSchema>;
