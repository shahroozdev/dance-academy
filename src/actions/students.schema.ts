import { z } from "zod";

import { phoneSchema } from "@/actions/validation.schema";

export const studentCreateSchema = z.object({
  fullName: z.string().min(1, "Student name is required"),
  familyId: z.string().min(1, "Family is required"),
  dob: z.iso.date().or(z.literal("")).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  medicalNotes: z.string().or(z.literal("")).optional(),
  generalNotes: z.string().or(z.literal("")).optional(),
  emergencyContactName: z.string().or(z.literal("")).optional(),
  emergencyContactRelationship: z.string().or(z.literal("")).optional(),
  emergencyPhone: phoneSchema.or(z.literal("")).optional(),
});

export const studentUpdateSchema = studentCreateSchema.partial();

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;

// A CSV import row is looser than studentCreateSchema — dob/gender are free text here (parsed
// leniently server-side) since they come from a spreadsheet, not a form control.
export const studentImportRowSchema = z.object({
  studentName: z.string().max(200),
  familyName: z.string().max(200).optional(),
  parentGuardianName: z.string().max(200).optional(),
  parentEmail: z.string().max(200).optional(),
  parentPhone: z.string().max(50).optional(),
  dob: z.string().max(50).optional(),
  gender: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

export const studentImportSchema = z.array(studentImportRowSchema).min(1).max(1000);

export type StudentImportRow = z.infer<typeof studentImportRowSchema>;
