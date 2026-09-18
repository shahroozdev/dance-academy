import { z } from "zod";

export const enrollmentCreateSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  classId: z.string().min(1, "Class is required"),
  startDate: z.iso.date().or(z.literal("")).optional(),
});

export const enrollmentUpdateSchema = z.object({
  endDate: z.string().optional(),
  status: z.enum(["ACTIVE", "ENDED"]).optional(),
});

export const enrollmentStartDateUpdateSchema = z.object({
  startDate: z.iso.date("Enter a valid enrollment start date"),
});

export const enrollmentBillingPauseSchema = z
  .object({
    startMonth: z.string().regex(/^\d{4}-\d{2}$/, "Select a valid start month"),
    endMonth: z.string().regex(/^\d{4}-\d{2}$/, "Select a valid resume month"),
    reason: z.string().trim().max(500).or(z.literal("")).optional(),
  })
  .refine((data) => data.endMonth >= data.startMonth, {
    message: "Resume month must be the same as or after the pause month",
    path: ["endMonth"],
  });

export type EnrollmentCreateInput = z.infer<typeof enrollmentCreateSchema>;
export type EnrollmentUpdateInput = z.infer<typeof enrollmentUpdateSchema>;
export type EnrollmentStartDateUpdateInput = z.infer<typeof enrollmentStartDateUpdateSchema>;
export type EnrollmentBillingPauseInput = z.infer<typeof enrollmentBillingPauseSchema>;
