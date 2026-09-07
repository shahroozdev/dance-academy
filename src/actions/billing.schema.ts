import { z } from "zod";

export const billingAdjustmentSchema = z
  .object({
    adjustment: z.coerce.number().multipleOf(0.01).min(-99999999.99).max(99999999.99),
    adjustmentNotes: z.string().trim().or(z.literal("")).optional(),
  })
  .refine((data) => data.adjustment === 0 || Boolean(data.adjustmentNotes), {
    message: "A note is required whenever the adjustment is non-zero",
    path: ["adjustmentNotes"],
  });

export type BillingAdjustmentInput = z.infer<typeof billingAdjustmentSchema>;
