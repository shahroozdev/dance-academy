import "dotenv/config";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { parseDateInput } from "../src/lib/content-format";
import {
  ANANTA_EDITIONS,
  ANANTA_MEDIA,
  ANANTA_REEL_PATH,
  ANANTA_TICKETS_URL,
  DEFAULT_SITE_SETTINGS,
  INSTRUCTORS,
  PERFORMANCE_PHOTOS,
  PERFORMANCES_INTRO,
} from "../src/lib/public-site";
import { SITE_MEDIA_SLOTS } from "../src/lib/site-media";

// Moves the website's built-in content (src/lib/public-site.ts) into the Content Portal's
// tables, so the public pages read it from there. The photos and videos themselves are already
// in the Cloudinary bucket (their addresses are in that file); this only makes the entries:
//
//   - site contact/social details and the home and search text  -> WebsiteSettings
//   - each festival edition, its artists, posters, and video      -> Festival (published)
//   - the two founder profiles and their portraits                -> PublicProfile (visible)
//   - the Performances page photos                                -> one published Performance
//     ("Performance Highlights") holding them as its gallery, so the page's grid comes from
//     the portal; real performances are added beside it as the client supplies their details
//
//   - the home video and still, founders photo, training pictures -> SiteMediaSlot
//
// It only ever adds. Anything already in the portal is left untouched (a festival year, a
// profile name, saved settings, or a file already stored), so it is safe to run again.
//
//   npm run content:seed -- --confirm-host=<database host>
//
// It writes to DATABASE_URL only. It prints the database host and stops unless --confirm-host
// names the same host.

const SETUP_NAME = "Website setup";
const REEL_TITLE = "A message from Dr. Neena Prasad";
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) fail("DATABASE_URL is not set.");

const host = new URL(connectionString).host;
const confirmedHost = process.argv.find((argument) => argument.startsWith("--confirm-host="))?.split("=")[1];
if (confirmedHost !== host) {
  fail(`This would write to the database at "${host}". Re-run with --confirm-host=${host} if that is the intended database.`);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

type SiteFile = { url: string; kind: "IMAGE" | "VIDEO"; title: string; altText?: string };

/** Returns the Media Library id for one of the site's own files, adding the entry if needed. */
async function ensureAsset({ url, kind, title, altText = "" }: SiteFile) {
  const existing = await db.mediaAsset.findFirst({ where: { url }, select: { id: true } });
  if (existing) return existing.id;

  const contentType = CONTENT_TYPES[path.extname(url).toLowerCase()];
  const asset = await db.mediaAsset.create({
    data: { kind, url, title, altText, contentType, uploadedByName: SETUP_NAME },
    select: { id: true },
  });
  console.warn(`  added ${url}`);
  return asset.id;
}

const socialHref = (label: string) => DEFAULT_SITE_SETTINGS.socialLinks.find((link) => link.label === label)?.href ?? null;

async function seedSettings() {
  if (await db.websiteSettings.findUnique({ where: { id: "default" }, select: { id: true } })) return 0;
  await db.websiteSettings.create({
    data: {
      id: "default",
      contactEmail: DEFAULT_SITE_SETTINGS.email,
      contactPhone: DEFAULT_SITE_SETTINGS.phone,
      whatsappUrl: DEFAULT_SITE_SETTINGS.whatsappUrl,
      facebookUrl: socialHref("Facebook"),
      instagramUrl: socialHref("Instagram"),
      seoDescription: DEFAULT_SITE_SETTINGS.seoDescription,
      homeIntro: DEFAULT_SITE_SETTINGS.homeIntro,
      updatedByName: SETUP_NAME,
    },
  });
  return 1;
}

async function seedFestivals(publisher: { id: string | null; name: string }) {
  const existingYears = new Set((await db.festival.findMany({ select: { year: true } })).map((festival) => festival.year));
  const missing = ANANTA_EDITIONS.filter((edition) => !existingYears.has(edition.year));

  for (const edition of missing) {
    const posterIds: string[] = [];
    for (const media of ANANTA_MEDIA) {
      posterIds.push(await ensureAsset({ url: media.src, kind: "IMAGE", title: media.alt, altText: media.alt }));
    }
    const reelId = await ensureAsset({ url: ANANTA_REEL_PATH, kind: "VIDEO", title: REEL_TITLE });

    await db.festival.create({
      data: {
        year: edition.year,
        label: edition.label,
        eventDate: parseDateInput(edition.startsAt.slice(0, 10)),
        startTime: edition.startsAt.slice(11, 16),
        venueName: edition.venueName,
        venueTown: edition.venueTown,
        summary: edition.summary,
        ticketUrl: ANANTA_TICKETS_URL,
        // This content is already live on the website, so it stays live.
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedById: publisher.id,
        publishedByName: publisher.name,
        artists: {
          create: edition.artists.map((artist, sortOrder) => ({ name: artist.name, artForm: artist.form, sortOrder })),
        },
        media: {
          create: [
            ...posterIds.map((assetId, sortOrder) => ({ assetId, role: "POSTER" as const, sortOrder })),
            { assetId: reelId, role: "VIDEO" as const, caption: REEL_TITLE, sortOrder: posterIds.length },
          ],
        },
      },
    });
  }
  return missing.length;
}

async function seedProfiles() {
  const existingNames = new Set((await db.publicProfile.findMany({ select: { name: true } })).map((profile) => profile.name));
  const missing = INSTRUCTORS.filter((instructor) => !existingNames.has(instructor.name));
  const firstOrder = await db.publicProfile.count();

  for (const [index, instructor] of missing.entries()) {
    const portrait = `Portrait of ${instructor.name}`;
    const photoId = await ensureAsset({ url: instructor.photo, kind: "IMAGE", title: portrait, altText: portrait });
    await db.publicProfile.create({
      data: {
        name: instructor.name,
        title: instructor.title,
        summary: instructor.summary,
        biography: instructor.biography.join("\n\n"),
        specializations: [...instructor.specializations],
        photoId,
        isVisible: true,
        sortOrder: firstOrder + index,
      },
    });
  }
  return missing.length;
}

async function seedPerformances(publisher: { id: string | null; name: string }) {
  if ((await db.performance.count()) > 0) return 0;

  const photoIds: string[] = [];
  for (const photo of PERFORMANCE_PHOTOS) {
    photoIds.push(await ensureAsset({ url: photo.src, kind: "IMAGE", title: photo.alt, altText: photo.alt }));
  }
  await db.performance.create({
    data: {
      slug: "performance-highlights",
      title: "Performance Highlights",
      summary: PERFORMANCES_INTRO[1],
      // No cover: this entry only supplies the Performances page's photo grid, not a card.
      status: "PUBLISHED",
      publishedAt: new Date(),
      publishedById: publisher.id,
      publishedByName: publisher.name,
      media: { create: photoIds.map((assetId, sortOrder) => ({ assetId, sortOrder })) },
    },
  });
  return 1;
}

async function seedSiteMedia() {
  const chosen = new Set((await db.siteMediaSlot.findMany({ select: { key: true } })).map((slot) => slot.key));
  const missing = SITE_MEDIA_SLOTS.filter((slot) => !chosen.has(slot.key));

  for (const slot of missing) {
    const assetId = await ensureAsset({
      url: slot.fallbackSrc,
      kind: slot.kind,
      title: slot.fallbackAlt,
      altText: slot.fallbackAlt,
    });
    await db.siteMediaSlot.create({ data: { key: slot.key, assetId, updatedByName: SETUP_NAME } });
  }
  return missing.length;
}

async function main() {
  console.warn(`Seeding website content into the database at ${host}...`);
  const owner = await db.contentUser.findFirst({
    where: { role: "OWNER", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  const publisher = owner ?? { id: null, name: SETUP_NAME };

  const settings = await seedSettings();
  const festivals = await seedFestivals(publisher);
  const profiles = await seedProfiles();
  const performances = await seedPerformances(publisher);
  const sitePlaces = await seedSiteMedia();

  const summary = `Added to the portal: ${festivals} festival(s), ${profiles} profile(s), ${performances} performance(s), ${sitePlaces} site image/video place(s), ${settings ? "site settings" : "no settings change"}.`;
  await db.contentAuditLog.create({
    data: { userId: publisher.id, userName: publisher.name, action: "imported", entityType: "website", summary },
  });
  console.warn(summary);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
