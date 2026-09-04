import { z } from "zod";

export const paymentCreateSchema = z.object({
  billingId: z.string().min(1, "Bill is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum(["ZELLE", "CASH", "CHECK", "OTHER"]),
  reference: z.string().or(z.literal("")).optional(),
  notes: z.string().or(z.literal("")).optional(),
});

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
