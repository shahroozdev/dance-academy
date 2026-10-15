import { z } from "zod";

export const classCreateSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  programId: z.string().min(1, "Dance program is required"),
  level: z.string().or(z.literal("")).optional(),
  teacherId: z.string().or(z.literal("")).optional(),
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]).optional(),
  firstClassDate: z.iso.date("Enter a valid first class date"),
  startTime: z.string().or(z.literal("")).optional(),
  endTime: z.string().or(z.literal("")).optional(),
  durationMins: z.coerce.number().int().positive().optional(),
  standardRate: z.coerce.number().positive("Rate must be positive"),
  // Soft cap only — enrolling past it is still allowed, just shows a warning. Optional since the
  // requirements doc never specifies a max class size.
  capacity: z.coerce.number().int().positive("Capacity must be a positive whole number").optional(),
  pricingType: z.enum(["REGULAR", "SEASONAL"]).default("REGULAR"),
  discountEligible: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const classUpdateSchema = classCreateSchema.partial();

export const classActiveStatusSchema = z.object({
  isActive: z.boolean(),
  lastClassDate: z.iso.date("Enter a valid last class date").optional(),
}).refine((value) => value.isActive || Boolean(value.lastClassDate), {
  message: "Last class date is required when deactivating a class",
  path: ["lastClassDate"],
});

export type ClassCreateInput = z.infer<typeof classCreateSchema>;
export type ClassUpdateInput = z.infer<typeof classUpdateSchema>;
