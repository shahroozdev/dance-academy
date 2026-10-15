import { z } from "zod";

import { phoneSchema } from "@/actions/validation.schema";

const joinDateSchema = z
  .iso.date("Enter a valid joining date")
  .refine((value) => new Date(`${value}T00:00:00.000Z`) <= new Date(), "Joining date cannot be in the future");

export const studentCreateSchema = z.object({
  fullName: z.string().min(1, "Student name is required"),
  familyId: z.string().min(1, "Family is required"),
  joinDate: joinDateSchema,
  dob: z.iso.date().or(z.literal("")).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  medicalNotes: z.string().or(z.literal("")).optional(),
  generalNotes: z.string().or(z.literal("")).optional(),
  emergencyContactName: z.string().or(z.literal("")).optional(),
  emergencyContactRelationship: z.string().or(z.literal("")).optional(),
  emergencyPhone: phoneSchema.or(z.literal("")).optional(),
});

export const studentUpdateSchema = studentCreateSchema.partial();

export const studentActiveStatusSchema = z.object({
  isActive: z.boolean(),
  lastClassDate: z.iso.date("Enter a valid last class date").optional(),
}).refine((value) => value.isActive || Boolean(value.lastClassDate), {
  message: "Last class date is required when deactivating a student",
  path: ["lastClassDate"],
});

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
  joinDate: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

export const studentImportSchema = z.array(studentImportRowSchema).min(1).max(1000);

export type StudentImportRow = z.infer<typeof studentImportRowSchema>;
