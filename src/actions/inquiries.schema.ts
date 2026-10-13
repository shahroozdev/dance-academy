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
