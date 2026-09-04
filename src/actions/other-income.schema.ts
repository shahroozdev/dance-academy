import { z } from "zod";

export const otherIncomeCategorySchema = z.enum([
  "REGISTRATION_FEE",
  "WORKSHOP_CAMP",
  "PERFORMANCE_FEE",
  "COSTUME_INCOME",
  "PRIVATE_LESSON",
  "MISCELLANEOUS",
]);

export const otherIncomeCreateSchema = z.object({
  date: z.string().min(1, "Date is required"),
  category: otherIncomeCategorySchema,
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["ZELLE", "CASH", "CHECK", "OTHER"]),
  notes: z.string().or(z.literal("")).optional(),
});

export const otherIncomeUpdateSchema = otherIncomeCreateSchema.partial();

export type OtherIncomeCreateInput = z.infer<typeof otherIncomeCreateSchema>;
export type OtherIncomeUpdateInput = z.infer<typeof otherIncomeUpdateSchema>;
