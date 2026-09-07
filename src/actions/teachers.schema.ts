import { z } from "zod";

export const teacherCreateSchema = z.object({
  name: z.string().min(1, "Teacher name is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().or(z.literal("")).optional(),
  notes: z.string().or(z.literal("")).optional(),
  isActive: z.boolean().default(true),
});

export const teacherUpdateSchema = teacherCreateSchema.partial();

export type TeacherCreateInput = z.infer<typeof teacherCreateSchema>;
export type TeacherUpdateInput = z.infer<typeof teacherUpdateSchema>;
