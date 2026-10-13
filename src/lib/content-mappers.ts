import type { MediaAsset, Prisma } from "@/generated/prisma/client";
import {
  eventStartIso,
  focalPosition,
  formatEventDate,
  formatEventTime,
  formatShortDate,
  splitParagraphs,
} from "@/lib/content-format";
import type {
  PublicFestival,
  PublicImage,
  PublicPerformance,
  PublicPressItem,
  PublicProfile,
} from "@/types/content";

// Turns stored content records into the shapes the public pages render. Used both for the live
// website (published records only) and for the portal's draft preview, so a preview is exactly
// what publishing will show.

export const festivalInclude = {
  artists: { orderBy: { sortOrder: "asc" }, include: { photo: true } },
  media: { orderBy: { sortOrder: "asc" }, include: { asset: true } },
} satisfies Prisma.FestivalInclude;

export const performanceInclude = {
  cover: true,
  media: { orderBy: { sortOrder: "asc" }, include: { asset: true } },
} satisfies Prisma.PerformanceInclude;

export const pressItemInclude = { image: true, document: true } satisfies Prisma.PressItemInclude;

export const profileInclude = { photo: true } satisfies Prisma.PublicProfileInclude;

export type FestivalRecord = Prisma.FestivalGetPayload<{ include: typeof festivalInclude }>;
export type PerformanceRecord = Prisma.PerformanceGetPayload<{ include: typeof performanceInclude }>;
export type PressItemRecord = Prisma.PressItemGetPayload<{ include: typeof pressItemInclude }>;
export type ProfileRecord = Prisma.PublicProfileGetPayload<{ include: typeof profileInclude }>;

export const PRESS_KIND_LABELS = {
  COVERAGE: "Newspaper & Online Coverage",
  INTERVIEW: "Interview",
  FEATURE: "Article & Feature",
  VIDEO: "Performance Video",
  APPEARANCE: "Media Appearance",
} as const;

// The venue line spells the state out, as the website always has; the two-letter code is kept
// for the address search engines read.
const REGION_NAMES: Record<string, string> = { IL: "Illinois" };

export const toPublicImage = (asset: MediaAsset): PublicImage => ({
  src: asset.url,
  alt: asset.altText || asset.title,
  position: focalPosition(asset.focalX, asset.focalY),
});

const optionalImage = (asset: MediaAsset | null) => (asset ? toPublicImage(asset) : null);

export function toPublicFestival(festival: FestivalRecord): PublicFestival {
  const mediaWithRole = (role: FestivalRecord["media"][number]["role"]) =>
    festival.media.filter((item) => item.role === role);

  return {
    year: festival.year,
    label: festival.label,
    date: formatEventDate(festival.eventDate),
    time: formatEventTime(festival.startTime),
    startsAt: eventStartIso(festival.eventDate, festival.startTime),
    venue: `${festival.venueName}, ${festival.venueTown}, ${REGION_NAMES[festival.venueRegion] ?? festival.venueRegion}`,
    venueName: festival.venueName,
    venueTown: festival.venueTown,
    venueRegion: festival.venueRegion,
    venueStreet: festival.venueStreet,
    venuePostalCode: festival.venuePostalCode,
    summary: festival.summary,
    ticketUrl: festival.ticketUrl,
    artists: festival.artists.map((artist) => ({
      name: artist.name,
      form: artist.artForm,
      biography: artist.biography,
      photo: optionalImage(artist.photo),
    })),
    posters: mediaWithRole("POSTER").map((item) => toPublicImage(item.asset)),
    gallery: mediaWithRole("GALLERY").map((item) => toPublicImage(item.asset)),
    videos: mediaWithRole("VIDEO").map((item) => ({ src: item.asset.url, title: item.caption || item.asset.title })),
    sponsors: mediaWithRole("SPONSOR").map((item) => ({
      name: item.caption || item.asset.title,
      logo: toPublicImage(item.asset),
      href: item.linkUrl,
    })),
  };
}

export function toPublicPerformance(performance: PerformanceRecord): PublicPerformance {
  return {
    slug: performance.slug,
    title: performance.title,
    date: performance.eventDate ? formatShortDate(performance.eventDate) : null,
    venue: performance.venue,
    summary: performance.summary,
    description: splitParagraphs(performance.description),
    cover: optionalImage(performance.cover),
    videoUrl: performance.videoUrl,
    externalUrl: performance.externalUrl,
    gallery: performance.media.map((item) => ({ ...toPublicImage(item.asset), caption: item.caption })),
  };
}

export function toPublicPressItem(item: PressItemRecord): PublicPressItem {
  return {
    id: item.id,
    title: item.title,
    outlet: item.outlet,
    kind: PRESS_KIND_LABELS[item.kind],
    date: item.publishedOn ? formatShortDate(item.publishedOn) : null,
    excerpt: item.excerpt,
    href: item.externalUrl,
    documentHref: item.document?.url ?? null,
    image: optionalImage(item.image),
  };
}

export function toPublicProfile(profile: ProfileRecord): PublicProfile {
  return {
    name: profile.name,
    photo: optionalImage(profile.photo),
    title: profile.title,
    specializations: profile.specializations,
    summary: profile.summary,
    biography: splitParagraphs(profile.biography),
  };
}
