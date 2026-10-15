import { z } from "zod";

const classFields = z.object({
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
  pricingType: z.enum(["REGULAR", "SEASONAL"]),
  discountEligible: z.boolean(),
  isActive: z.boolean(),
});

export const classCreateSchema = classFields.extend({
  pricingType: classFields.shape.pricingType.default("REGULAR"),
  discountEligible: classFields.shape.discountEligible.default(true),
  isActive: classFields.shape.isActive.default(true),
});

// Active status is deliberately not editable here: deactivation needs an exact last class date
// and goes through toggleClassActive. The edit form submits the class's current isActive with
// every save, and treating that as a status change reset an inactive class's last class date
// and billing boundary to the day of the edit. Built from the default-free fields because Zod
// still applies a `.default()` inside `.partial()`, which would reset an omitted pricing type
// to REGULAR and discount eligibility to true.
export const classUpdateSchema = classFields.omit({ isActive: true }).partial();

export const classActiveStatusSchema = z.object({
  isActive: z.boolean(),
  lastClassDate: z.iso.date("Enter a valid last class date").optional(),
}).refine((value) => value.isActive || Boolean(value.lastClassDate), {
  message: "Last class date is required when deactivating a class",
  path: ["lastClassDate"],
});

export type ClassCreateInput = z.infer<typeof classCreateSchema>;
export type ClassUpdateInput = z.infer<typeof classUpdateSchema>;
