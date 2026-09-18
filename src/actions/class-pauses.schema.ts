import { z } from "zod";

export const classBillingPauseSchema = z.object({
  startMonth: z.string().regex(/^\d{4}-\d{2}$/, "Select a start month"),
  endMonth: z.string().regex(/^\d{4}-\d{2}$/, "Select an end month"),
  reason: z.string().trim().max(500).or(z.literal("")).optional(),
}).refine((data) => data.endMonth >= data.startMonth, {
  message: "End month must be the same as or later than the start month",
  path: ["endMonth"],
});

export type ClassBillingPauseInput = z.infer<typeof classBillingPauseSchema>;
