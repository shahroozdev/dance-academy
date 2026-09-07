import { z } from "zod";

export const paymentCreateSchema = z.object({
  billingId: z.string().min(1, "Bill is required"),
  paymentDate: z.iso.date("Enter a valid payment date"),
  amount: z.coerce.number().positive("Amount must be greater than 0").multipleOf(0.01).max(99999999.99),
  method: z.enum(["ZELLE", "CASH", "CHECK", "OTHER"]),
  reference: z.string().or(z.literal("")).optional(),
  notes: z.string().or(z.literal("")).optional(),
});

export const refundCreateSchema = paymentCreateSchema.extend({ notes: z.string().trim().min(1, "A refund reason is required") });
export type RefundCreateInput = z.infer<typeof refundCreateSchema>;

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
