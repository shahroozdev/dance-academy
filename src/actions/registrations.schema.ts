import { z } from "zod";

const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(/^[+]?[0-9\s().-]{7,20}$/, "Enter a valid phone number");

const dobSchema = z
  .iso.date("Enter a valid date of birth")
  .refine((value) => new Date(value) <= new Date(), "Date of birth cannot be in the future")
  .or(z.literal(""))
  .optional();

export const registrationRequestCreateSchema = z.object({
  parentGuardianName: z.string().min(1, "Parent/guardian name is required"),
  parentEmail: z.email("Enter a valid email").or(z.literal("")).optional(),
  parentPhone: phoneSchema,
  studentFullName: z.string().min(1, "Student name is required"),
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
