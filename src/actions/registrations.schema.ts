import { z } from "zod";

export const registrationRequestCreateSchema = z.object({
  parentGuardianName: z.string().min(1, "Parent/guardian name is required"),
  parentEmail: z.email("Enter a valid email").or(z.literal("")).optional(),
  parentPhone: z.string().min(1, "Parent phone is required"),
  studentFullName: z.string().min(1, "Student name is required"),
  dob: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  requestedClassId: z.string().min(1, "Please select a class"),
  previousDanceExperience: z.string().or(z.literal("")).optional(),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactRelationship: z.string().min(1, "Relationship is required"),
  emergencyPhone: z.string().min(1, "Emergency phone is required"),
  studioPolicyAgreement: z
    .boolean()
    .refine((value) => value === true, "You must agree to the studio policy"),
  photoVideoConsent: z.boolean(),
});

export type RegistrationRequestCreateInput = z.infer<typeof registrationRequestCreateSchema>;
