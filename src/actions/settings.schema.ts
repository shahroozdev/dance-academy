import { z } from "zod";

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const studioSettingsSchema = z.object({
  primaryColor: z.string().regex(hexColorRegex, "Must be a valid hex color (e.g. #9B1B5E)"),
  secondaryColor: z.string().regex(hexColorRegex, "Must be a valid hex color"),
  accentColor: z.string().regex(hexColorRegex, "Must be a valid hex color"),
  fontSize: z.enum(["SMALL", "MEDIUM", "LARGE"]),
  studioName: z.string().min(1).max(100),
});

export type StudioSettingsInput = z.infer<typeof studioSettingsSchema>;
