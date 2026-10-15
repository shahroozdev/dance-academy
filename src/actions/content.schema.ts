import { z } from "zod";

import { CONTENT_ENTITIES } from "@/types/content";
import { HERO_THEME_KEYS } from "@/types/site-appearance";

// Validation for everything the Content Portal saves. Form fields are plain strings (an empty
// string means "not provided"), so the same schema drives the form and the server action.

const text = (label: string, max: number) => z.string().trim().min(1, `${label} is required`).max(max);
const optionalText = (max: number) => z.string().trim().max(max);

export const linkSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => /^https?:\/\/\S+$/i.test(value), "Enter a full link starting with https://");
const optionalLinkSchema = linkSchema.or(z.literal(""));

const assetIdSchema = z.string().trim().min(1, "Choose a file from the Media Library").max(200);

const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");
const optionalDateInput = dateInput.or(z.literal(""));

export const contentEntitySchema = z.enum(CONTENT_ENTITIES);
export const contentStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const mediaKindSchema = z.enum(["IMAGE", "VIDEO", "DOCUMENT"]);

// ---------- Festivals ----------

export const FESTIVAL_MEDIA_ROLES = ["POSTER", "GALLERY", "VIDEO", "SPONSOR"] as const;

export const festivalSchema = z.object({
  year: z.string().regex(/^\d{4}$/, "Enter a four-digit year"),
  label: text("Edition label", 120),
  eventDate: dateInput,
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time such as 15:00"),
  venueName: text("Venue name", 200),
  venueTown: text("Town", 120),
  venueRegion: text("State", 60),
  venueStreet: optionalText(200),
  venuePostalCode: optionalText(20),
  summary: text("Summary", 2000),
  ticketUrl: optionalLinkSchema,
  artists: z
    .array(
      z.object({
        name: text("Artist name", 200),
        artForm: text("Art form", 120),
        biography: optionalText(5000),
        photoId: z.string(),
      }),
    )
    .max(40),
  media: z
    .array(
      z.object({
        assetId: assetIdSchema,
        role: z.enum(FESTIVAL_MEDIA_ROLES),
        caption: optionalText(300),
        linkUrl: optionalLinkSchema,
      }),
    )
    .max(80),
});
export type FestivalInput = z.infer<typeof festivalSchema>;

// ---------- Performances ----------

export const performanceSchema = z.object({
  title: text("Title", 200),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens")
    .or(z.literal("")),
  eventDate: optionalDateInput,
  venue: optionalText(200),
  summary: text("Summary", 600),
  description: optionalText(10000),
  coverId: z.string(),
  videoUrl: optionalLinkSchema,
  externalUrl: optionalLinkSchema,
  media: z.array(z.object({ assetId: assetIdSchema, caption: optionalText(300) })).max(80),
});
export type PerformanceInput = z.infer<typeof performanceSchema>;

// ---------- Press & media ----------

export const PRESS_ITEM_KINDS = ["COVERAGE", "INTERVIEW", "FEATURE", "VIDEO", "APPEARANCE"] as const;

export const pressItemSchema = z.object({
  title: text("Title", 300),
  outlet: optionalText(200),
  kind: z.enum(PRESS_ITEM_KINDS),
  publishedOn: optionalDateInput,
  excerpt: optionalText(2000),
  externalUrl: optionalLinkSchema,
  imageId: z.string(),
  documentId: z.string(),
});
export type PressItemInput = z.infer<typeof pressItemSchema>;

// ---------- Media library ----------

const focalPercent = z
  .string()
  .regex(/^\d{1,3}$/, "Enter a number from 0 to 100")
  .refine((value) => Number(value) <= 100, "Enter a number from 0 to 100");

export const mediaDetailsSchema = z.object({
  title: text("Title", 200),
  altText: optionalText(400),
  attribution: optionalText(200),
  focalX: focalPercent,
  focalY: focalPercent,
});
export type MediaDetailsInput = z.infer<typeof mediaDetailsSchema>;

export const mediaLinkSchema = z.object({
  kind: z.enum(["VIDEO", "DOCUMENT"]),
  title: text("Title", 200),
  url: linkSchema,
});
export type MediaLinkInput = z.infer<typeof mediaLinkSchema>;

/** What the browser reports after sending a file straight to Cloudinary. */
export const mediaUploadReceiptSchema = z.object({
  kind: z.enum(["IMAGE", "VIDEO"]),
  publicId: z.string().min(1).max(300),
  version: z.number().int().positive(),
  signature: z.string().regex(/^[a-f0-9]{40}$/),
  format: z.string().regex(/^[a-z0-9]{2,5}$/),
  bytes: z.number().int().positive(),
  title: text("Title", 200),
  altText: optionalText(400),
});
export type MediaUploadReceiptInput = z.infer<typeof mediaUploadReceiptSchema>;

export const uploadKindSchema = z.enum(["IMAGE", "VIDEO"]);

export const mediaListSchema = z.object({ kind: mediaKindSchema.optional(), search: z.string().max(200).optional() }).strict();

// ---------- Public profiles ----------

export const profileSchema = z.object({
  name: text("Name", 200),
  title: text("Title", 200),
  summary: text("Short summary", 600),
  biography: text("Biography", 10000),
  /** One specialization per line or separated by commas. */
  specializations: optionalText(600),
  photoId: z.string(),
  isVisible: z.boolean(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

// ---------- Website settings ----------

const heroThemeSchema = z.enum(HERO_THEME_KEYS);
export const heroThemesSchema = z.object({
  about: heroThemeSchema,
  training: heroThemeSchema,
  instructors: heroThemeSchema,
  performances: heroThemeSchema,
  festival: heroThemeSchema,
  press: heroThemeSchema,
  support: heroThemeSchema,
  contact: heroThemeSchema,
});

export const websiteSettingsSchema = z.object({
  contactEmail: z.email("Enter a valid email address").trim().toLowerCase(),
  contactPhone: text("Phone number", 40),
  whatsappUrl: optionalLinkSchema,
  facebookUrl: optionalLinkSchema,
  instagramUrl: optionalLinkSchema,
  seoDescription: text("Search description", 320),
  homeIntro: text("Home page introduction", 600),
  heroThemes: heroThemesSchema,
});
export type WebsiteSettingsInput = z.infer<typeof websiteSettingsSchema>;

// ---------- Content users ----------

const passwordSchema = z.string().min(10, "Use at least 10 characters").max(200);
const contentRoleSchema = z.enum(["OWNER", "EDITOR"]);

export const contentUserCreateSchema = z.object({
  name: text("Name", 200),
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  role: contentRoleSchema,
  password: passwordSchema,
});
export type ContentUserCreateInput = z.infer<typeof contentUserCreateSchema>;

export const contentUserUpdateSchema = z.object({
  name: text("Name", 200),
  role: contentRoleSchema,
  isActive: z.boolean(),
});
export type ContentUserUpdateInput = z.infer<typeof contentUserUpdateSchema>;

export const contentPasswordSchema = z.object({ password: passwordSchema });
export type ContentPasswordInput = z.infer<typeof contentPasswordSchema>;
