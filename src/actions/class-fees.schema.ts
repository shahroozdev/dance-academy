import { z } from "zod";

export const classMonthlyFeeUpdateSchema = z.object({
  billableSessions: z.coerce.number().int().nonnegative().optional(),
  rate: z.coerce.number().nonnegative().optional(),
  flatFee: z.coerce.number().nonnegative().optional(),
  monthlyClassFee: z.coerce.number().nonnegative("Monthly class fee is required"),
  notes: z.string().or(z.literal("")).optional(),
});

export type ClassMonthlyFeeUpdateInput = z.infer<typeof classMonthlyFeeUpdateSchema>;
