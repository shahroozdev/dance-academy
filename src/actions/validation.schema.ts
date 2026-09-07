import { z } from "zod";

export const idSchema = z.string().trim().min(1).max(200);
export const booleanSchema = z.boolean();
export const dateInputSchema = z.string().min(1).refine((value) => Number.isFinite(Date.parse(value)), "Enter a valid date");

const listQuerySchema = z.object({
  page: z.number().int().min(1).max(100000).optional(),
  pageSize: z.number().int().min(1).max(10000).optional(),
  search: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  sortBy: z.string().max(100).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  status: z.enum(["PENDING", "PROCESSED", "REJECTED", "ACTIVE", "ENDED", "UNPAID", "PARTIAL", "PAID", "OVERPAID"]).optional(),
  classId: idSchema.optional(), familyId: idSchema.optional(), studentId: idSchema.optional(), billingId: idSchema.optional(),
  month: dateInputSchema.optional(), dateFrom: dateInputSchema.optional(), dateTo: dateInputSchema.optional(),
  method: z.enum(["ZELLE", "CASH", "CHECK", "OTHER"]).optional(),
  category: z.enum(["STUDIO_RENT", "INSTRUCTOR_CHOREOGRAPHER", "COSTUMES", "JEWELRY_PROPS", "COMPETITION_EVENT_FEES", "ADVERTISING", "SOFTWARE_SUBSCRIPTIONS", "MUSIC_EDITING", "SUPPLIES", "TRAVEL", "MISCELLANEOUS", "REGISTRATION_FEE", "WORKSHOP_CAMP", "PERFORMANCE_FEE", "COSTUME_INCOME", "PRIVATE_LESSON"]).optional(),
}).strict();

export function validateListQuery(input: unknown, sortFields: readonly string[] = []) {
  const parsed = listQuerySchema.parse(input ?? {});
  if (parsed.sortBy && !sortFields.includes(parsed.sortBy)) throw new Error("Invalid sort column.");
}

export const yearSchema = z.number().int().min(1900).max(9999);
export const periodSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MONTH"), month: dateInputSchema }),
  z.object({ type: z.literal("YEAR"), year: yearSchema }),
  z.object({ type: z.literal("ALL_TIME") }),
]);
