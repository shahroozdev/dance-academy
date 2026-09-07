import { z } from "zod";

import { phoneSchema } from "@/actions/validation.schema";

const dobSchema = z
  .iso.date("Enter a valid date of birth")
  .refine((value) => new Date(value) <= new Date(), "Date of birth cannot be in the future")
  .or(z.literal(""))
  .optional();

export const registrationRequestCreateSchema = z.object({
  parentGuardianName: z.string().trim().min(1, "Parent/guardian name is required").max(200),
  parentEmail: z
    .email("Enter a valid email")
    .trim()
    .toLowerCase()
    .or(z.literal(""))
    .optional(),
  parentPhone: phoneSchema,
  studentFullName: z.string().trim().min(1, "Student name is required").max(200),
  dob: dobSchema,
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  requestedClassId: z.string().min(1, "Please select a class"),
  previousDanceExperience: z.string().or(z.literal("")).optional(),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactRelationship: z.string().min(1, "Relationship is required"),
  emergencyPhone: phoneSchema,
  studioPolicyAgreement: z
    .boolean()
    .refine((value) => value === true, "You must agree to the studio policy"),
  photoVideoConsent: z.boolean(),
});

export type RegistrationRequestCreateInput = z.infer<typeof registrationRequestCreateSchema>;
