import { z } from "zod";

export const billingAdjustmentSchema = z
  .object({
    adjustment: z.coerce.number(),
    adjustmentNotes: z.string().or(z.literal("")).optional(),
  })
  .refine((data) => data.adjustment === 0 || Boolean(data.adjustmentNotes), {
    message: "A note is required whenever the adjustment is non-zero",
    path: ["adjustmentNotes"],
  });

export type BillingAdjustmentInput = z.infer<typeof billingAdjustmentSchema>;
