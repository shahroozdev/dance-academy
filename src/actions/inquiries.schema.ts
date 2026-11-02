import { z } from "zod";

import { phoneSchema } from "@/actions/validation.schema";

export const INQUIRY_INTERESTS = [
  "Bharatanatyam",
  "Mohiniyattam",
  "Bollywood/Cinematic",
  "Semi Classical",
  "Performance Booking",
  "Sponsorship",
  "Collaboration",
  "Malhaar Ananta Arts Festival",
  "Media/Press",
  "Other",
] as const;

export const INQUIRY_LOCATIONS = ["Wood Dale", "Elgin"] as const;

export const websiteInquirySchema = z.object({
  name: z.string().trim().min(1, "Your name is required").max(200),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  phone: phoneSchema.or(z.literal("")).optional(),
  studentName: z.string().trim().max(200).optional(),
  studentAge: z
    .string()
    .trim()
    .regex(/^\d{1,2}$/, "Enter the age in years")
    .or(z.literal(""))
    .optional(),
  interestedIn: z.enum(INQUIRY_INTERESTS, "Please choose what you are interested in"),
  preferredLocation: z.enum(INQUIRY_LOCATIONS).or(z.literal("")).optional(),
  message: z.string().trim().min(1, "Please write a short message").max(4000),
  // Hidden from people; a filled value means an automated submission, which the action drops.
  company: z.string().max(200).optional(),
});

export type WebsiteInquiryInput = z.infer<typeof websiteInquirySchema>;

// ---------- Job applications ----------
// Saved as inquiries with this topic, but sent from their own form on the Careers page and read
// on their own screen in the Content Portal.

export const JOB_APPLICATION_TOPIC = "Job Application";

/** The position value for an application not tied to a listed opening. */
export const GENERAL_APPLICATION = "GENERAL";

export const MAX_RESUME_BYTES = 4 * 1024 * 1024;

export const jobApplicationSchema = z.object({
  name: z.string().trim().min(1, "Your name is required").max(200),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  phone: phoneSchema,
  jobOpeningId: z.string().min(1, "Please choose a position").max(100),
  experience: z.string().trim().min(1, "Please tell us about your experience").max(4000),
  availability: z.string().trim().max(500).optional(),
  message: z.string().trim().max(4000).optional(),
  // Hidden from people; a filled value means an automated submission, which the action drops.
  company: z.string().max(200).optional(),
});

export type JobApplicationInput = z.infer<typeof jobApplicationSchema>;
