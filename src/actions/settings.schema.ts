import { z } from "zod";

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

// primaryColor/secondaryColor/accentColor come from a fixed set of presets in the UI (see
// THEME_PRESETS in settings-client.tsx), but validated as plain hex here since that's what
// actually gets stored — the schema doesn't need to know about the preset list.
export const themeSettingsSchema = z.object({
  primaryColor: z.string().regex(hexColorRegex, "Must be a valid hex color (e.g. #9B1B5E)"),
  secondaryColor: z.string().regex(hexColorRegex, "Must be a valid hex color"),
  accentColor: z.string().regex(hexColorRegex, "Must be a valid hex color"),
  fontSize: z.enum(["SMALL", "MEDIUM", "LARGE"]),
});

export type ThemeSettingsInput = z.infer<typeof themeSettingsSchema>;

export const businessProfileSchema = z.object({
  studioName: z.string().min(1).max(100),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

// Percentages are entered as a fraction (e.g. 0.05 = 5%).
export const discountSettingsSchema = z.object({
  multiClassDiscountPct: z.coerce.number().min(0, "Must be 0 or greater").max(1, "Must be 1 or less (e.g. 0.05 for 5%)"),
  siblingDiscountPct: z.coerce.number().min(0, "Must be 0 or greater").max(1, "Must be 1 or less (e.g. 0.05 for 5%)"),
});

export type DiscountSettingsInput = z.infer<typeof discountSettingsSchema>;

// dueDayOfMonth is a calendar day (1-28, to stay valid in every month); reminders fire this many
// days after that date passes on a still-UNPAID/PARTIAL bill (§5.4).
export const reminderSettingsSchema = z.object({
  dueDayOfMonth: z.coerce.number().int().min(1, "Must be between 1 and 28").max(28, "Must be between 1 and 28"),
  paymentReminderDaysAfterDue: z.coerce.number().int().min(0, "Must be 0 or greater").max(60, "Must be 60 or less"),
});

export type ReminderSettingsInput = z.infer<typeof reminderSettingsSchema>;

// smtpPassword is left blank when the studio doesn't want to change the stored secret.
export const smtpSettingsSchema = z.object({
  smtpHost: z.string().max(255).optional().or(z.literal("")),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().max(255).optional().or(z.literal("")),
  smtpPassword: z.string().max(500).optional().or(z.literal("")),
  emailFrom: z.string().max(255).optional().or(z.literal("")),
});

export type SmtpSettingsInput = z.infer<typeof smtpSettingsSchema>;

// whatsappAccessToken is left blank when the studio doesn't want to change the stored secret.
export const whatsappSettingsSchema = z.object({
  whatsappPhoneNumberId: z.string().max(255).optional().or(z.literal("")),
  whatsappBusinessAccountId: z.string().max(255).optional().or(z.literal("")),
  whatsappAccessToken: z.string().max(1000).optional().or(z.literal("")),
});

export type WhatsappSettingsInput = z.infer<typeof whatsappSettingsSchema>;

export const studioSettingsUpdateSchema = themeSettingsSchema
  .merge(businessProfileSchema)
  .merge(discountSettingsSchema)
  .merge(reminderSettingsSchema)
  .merge(smtpSettingsSchema)
  .merge(whatsappSettingsSchema)
  .partial();

export type StudioSettingsUpdateInput = z.infer<typeof studioSettingsUpdateSchema>;
