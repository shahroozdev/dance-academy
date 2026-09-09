import { z } from "zod";

export const programCreateSchema = z.object({
  name: z.string().trim().min(1, "Program name is required").max(100),
  description: z.string().trim().max(500).or(z.literal("")).optional(),
  isActive: z.boolean().default(true),
});

export const programUpdateSchema = programCreateSchema.partial();

export type ProgramCreateInput = z.infer<typeof programCreateSchema>;
export type ProgramUpdateInput = z.infer<typeof programUpdateSchema>;
