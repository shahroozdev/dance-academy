import { z } from "zod";

export const classCreateSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  danceStyle: z.string().min(1, "Dance style is required"),
  level: z.string().or(z.literal("")).optional(),
  teacher: z.string().or(z.literal("")).optional(),
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]).optional(),
  startTime: z.string().or(z.literal("")).optional(),
  endTime: z.string().or(z.literal("")).optional(),
  durationMins: z.coerce.number().int().positive().optional(),
  standardRate: z.coerce.number().positive("Rate must be positive"),
  pricingType: z.enum(["REGULAR", "SEASONAL"]).default("REGULAR"),
  discountEligible: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const classUpdateSchema = classCreateSchema.partial();

export type ClassCreateInput = z.infer<typeof classCreateSchema>;
export type ClassUpdateInput = z.infer<typeof classUpdateSchema>;
