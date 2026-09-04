import { z } from "zod";

export const enrollmentCreateSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  classId: z.string().min(1, "Class is required"),
  startDate: z.string().optional(),
});

export const enrollmentUpdateSchema = z.object({
  endDate: z.string().optional(),
  status: z.enum(["ACTIVE", "ENDED"]).optional(),
});

export type EnrollmentCreateInput = z.infer<typeof enrollmentCreateSchema>;
export type EnrollmentUpdateInput = z.infer<typeof enrollmentUpdateSchema>;
