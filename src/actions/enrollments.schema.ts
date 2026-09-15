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

export type EnrollmentCreateInput = z.infer<typeof enrollmentCreateSchema>;
export type EnrollmentUpdateInput = z.infer<typeof enrollmentUpdateSchema>;
export type EnrollmentStartDateUpdateInput = z.infer<typeof enrollmentStartDateUpdateSchema>;
