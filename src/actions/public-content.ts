import "server-only";

import { cache } from "react";

import {
  festivalInclude,
  performanceInclude,
  pressItemInclude,
  profileInclude,
  toPublicFestival,
  toPublicImage,
  toPublicPerformance,
  toPublicPressItem,
  toPublicProfile,
} from "@/lib/content-mappers";
import { db } from "@/lib/db";
import { BUILT_IN_FESTIVALS, BUILT_IN_PROFILES, DEFAULT_SITE_SETTINGS } from "@/lib/public-site";
import { DEFAULT_HERO_THEMES, readHeroThemes } from "@/lib/site-appearance";
import { SITE_MEDIA_SLOTS } from "@/lib/site-media";
import type {
  PublicPerformance,
  PublicPressItem,
  PublicSiteMedia,
  PublicSiteSettings,
  PublicSocialLink,
} from "@/types/content";
import type { HeroThemes } from "@/types/site-appearance";

// What the public website reads (no session). Only published or explicitly visible records ever
// leave these functions — drafts and archived items are filtered here, not in the pages.
//
// Each reader falls back to the website's built-in content (src/lib/public-site.ts) when the
// portal has nothing for it yet or its tables cannot be read, so the website never breaks because
// of the portal. `null` from a loader means "nothing has been entered in the portal yet".

async function fromPortal<T>(what: string, load: () => Promise<T | null>, fallback: T): Promise<T> {
  try {
    return (await load()) ?? fallback;
  } catch (error) {
    // Only the message is logged — the full database error would bury the log line that matters.
    console.warn(
      `[website] Showing the built-in ${what}; the Content Portal's could not be loaded:`,
      error instanceof Error ? error.message.trim().split("\n").pop() : error,
    );
    return fallback;
  }
}

/** Published festival editions, newest first. */
export const getPublicFestivals = cache(() =>
  fromPortal(
    "festival details",
    async () => {
      const festivals = await db.festival.findMany({ orderBy: { year: "desc" }, include: festivalInclude });
      if (festivals.length === 0) return null;
      return festivals.filter((festival) => festival.status === "PUBLISHED").map(toPublicFestival);
    },
    BUILT_IN_FESTIVALS,
  ),
);

/** Published performances, newest first. Empty until performances are published in the portal. */
export const getPublicPerformances = cache(() =>
  fromPortal<PublicPerformance[]>(
    "performance photos",
    async () => {
      const performances = await db.performance.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ eventDate: { sort: "desc", nulls: "last" } }, { publishedAt: "desc" }],
        include: performanceInclude,
      });
      return performances.map(toPublicPerformance);
    },
    [],
  ),
);

export const getPublicPerformance = cache(async (slug: string) =>
  (await getPublicPerformances()).find((performance) => performance.slug === slug) ?? null,
);

/** Published press items, newest first. Empty until press items are published in the portal. */
export const getPublicPressItems = cache(() =>
  fromPortal<PublicPressItem[]>(
    "press section",
    async () => {
      const items = await db.pressItem.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ publishedOn: { sort: "desc", nulls: "last" } }, { publishedAt: "desc" }],
        include: pressItemInclude,
      });
      return items.map(toPublicPressItem);
    },
    [],
  ),
);

/** The founder/instructor profiles switched on for the website, in their chosen order. */
export const getPublicProfiles = cache(() =>
  fromPortal(
    "founder profiles",
    async () => {
      const profiles = await db.publicProfile.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: profileInclude,
      });
      if (profiles.length === 0) return null;
      return profiles.filter((profile) => profile.isVisible).map(toPublicProfile);
    },
    BUILT_IN_PROFILES,
  ),
);

const BUILT_IN_SITE_MEDIA: PublicSiteMedia = Object.fromEntries(
  SITE_MEDIA_SLOTS.map((slot) => [slot.key, { src: slot.fallbackSrc, alt: slot.fallbackAlt }]),
);

/**
 * The picture or video for each fixed place on the website (src/lib/site-media.ts), by slot key.
 * A place with nothing chosen in the portal keeps the file that ships with the site.
 */
export const getPublicSiteMedia = cache(() =>
  fromPortal<PublicSiteMedia>(
    "site images",
    async () => {
      const chosen = await db.siteMediaSlot.findMany({ include: { asset: true } });
      return {
        ...BUILT_IN_SITE_MEDIA,
        ...Object.fromEntries(chosen.map((slot) => [slot.key, toPublicImage(slot.asset)])),
      };
    },
    BUILT_IN_SITE_MEDIA,
  ),
);

/** The selected, curated hero style for every public inner page. */
export const getPublicHeroThemes = cache(() =>
  fromPortal<HeroThemes>(
    "hero styles",
    async () => {
      const settings = await db.websiteSettings.findUnique({ where: { id: "default" }, select: { heroThemes: true } });
      return settings ? readHeroThemes(settings.heroThemes) : null;
    },
    DEFAULT_HERO_THEMES,
  ),
);

/**
 * The logo uploaded in Studio Admin's Settings, used across the public site and both portals.
 * Null (nothing uploaded, or the setting cannot be read) means the logo that ships with the site.
 */
export const getSiteLogoUrl = cache(() =>
  fromPortal<string | null>(
    "logo",
    async () => (await db.studioSettings.findUnique({ where: { id: "default" }, select: { logoUrl: true } }))?.logoUrl ?? null,
    null,
  ),
);

export const getPublicSiteSettings = cache(() =>
  fromPortal<PublicSiteSettings>(
    "contact details",
    async () => {
      const settings = await db.websiteSettings.findUnique({ where: { id: "default" } });
      if (!settings) return null;
      const socialLinks: PublicSocialLink[] = [
        ...(settings.facebookUrl ? [{ href: settings.facebookUrl, label: "Facebook" as const }] : []),
        ...(settings.instagramUrl ? [{ href: settings.instagramUrl, label: "Instagram" as const }] : []),
      ];
      return {
        email: settings.contactEmail,
        phone: settings.contactPhone,
        whatsappUrl: settings.whatsappUrl,
        socialLinks,
        seoDescription: settings.seoDescription,
        homeIntro: settings.homeIntro,
      };
    },
    DEFAULT_SITE_SETTINGS,
  ),
);
