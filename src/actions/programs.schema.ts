import { z } from "zod";

const programFields = z.object({
  name: z.string().trim().min(1, "Program name is required").max(100),
  description: z.string().trim().max(500).or(z.literal("")).optional(),
  isActive: z.boolean(),
});

export const programCreateSchema = programFields.extend({ isActive: programFields.shape.isActive.default(true) });

// Built from the default-free fields: Zod still applies a `.default()` inside `.partial()`, so an
// update that omits isActive would otherwise silently reactivate an inactive program.
export const programUpdateSchema = programFields.partial();

export type ProgramCreateInput = z.infer<typeof programCreateSchema>;
export type ProgramUpdateInput = z.infer<typeof programUpdateSchema>;
