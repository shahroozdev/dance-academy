import { z } from "zod";

export const expenseCategorySchema = z.enum([
  "STUDIO_RENT",
  "INSTRUCTOR_CHOREOGRAPHER",
  "COSTUMES",
  "JEWELRY_PROPS",
  "COMPETITION_EVENT_FEES",
  "ADVERTISING",
  "SOFTWARE_SUBSCRIPTIONS",
  "MUSIC_EDITING",
  "SUPPLIES",
  "TRAVEL",
  "MISCELLANEOUS",
]);

export const expenseCreateSchema = z.object({
  date: z.string().min(1, "Date is required"),
  category: expenseCategorySchema,
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["ZELLE", "CASH", "CHECK", "OTHER"]),
  notes: z.string().or(z.literal("")).optional(),
});

export const expenseUpdateSchema = expenseCreateSchema.partial();

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
