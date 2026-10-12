import { z } from "zod";

export const classSessionReportSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Enter a valid month"),
  reportedSessions: z.coerce.number().int().nonnegative("Sessions must be zero or more"),
  reportNotes: z.string().or(z.literal("")).optional(),
});

export type ClassSessionReportInput = z.infer<typeof classSessionReportSchema>;
