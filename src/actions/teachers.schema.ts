import { z } from "zod";

import { phoneSchema } from "@/actions/validation.schema";

const teacherFields = z.object({
  name: z.string().min(1, "Teacher name is required"),
  email: z.email("Invalid email").trim().toLowerCase().or(z.literal("")).optional(),
  phone: phoneSchema.or(z.literal("")).optional(),
  notes: z.string().or(z.literal("")).optional(),
  isActive: z.boolean(),
});

export const teacherCreateSchema = teacherFields.extend({ isActive: teacherFields.shape.isActive.default(true) });

// Built from the default-free fields: Zod still applies a `.default()` inside `.partial()`, so an
// update that omits isActive would otherwise silently reactivate an inactive teacher.
export const teacherUpdateSchema = teacherFields.partial();

export type TeacherCreateInput = z.infer<typeof teacherCreateSchema>;
export type TeacherUpdateInput = z.infer<typeof teacherUpdateSchema>;
