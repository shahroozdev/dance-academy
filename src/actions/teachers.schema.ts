import { z } from "zod";

import { phoneSchema } from "@/actions/validation.schema";

export const teacherCreateSchema = z.object({
  name: z.string().min(1, "Teacher name is required"),
  email: z.email("Invalid email").trim().toLowerCase().or(z.literal("")).optional(),
  phone: phoneSchema.or(z.literal("")).optional(),
  notes: z.string().or(z.literal("")).optional(),
  isActive: z.boolean().default(true),
});

export const teacherUpdateSchema = teacherCreateSchema.partial();

export type TeacherCreateInput = z.infer<typeof teacherCreateSchema>;
export type TeacherUpdateInput = z.infer<typeof teacherUpdateSchema>;
