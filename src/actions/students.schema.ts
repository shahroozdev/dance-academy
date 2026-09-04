import { z } from "zod";

export const studentCreateSchema = z.object({
  fullName: z.string().min(1, "Student name is required"),
  familyId: z.string().min(1, "Family is required"),
  dob: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  medicalNotes: z.string().or(z.literal("")).optional(),
  generalNotes: z.string().or(z.literal("")).optional(),
  emergencyContactName: z.string().or(z.literal("")).optional(),
  emergencyContactRelationship: z.string().or(z.literal("")).optional(),
  emergencyPhone: z.string().or(z.literal("")).optional(),
});

export const studentUpdateSchema = studentCreateSchema.partial();

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;
