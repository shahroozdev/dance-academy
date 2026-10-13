import {
  ANANTA_INTRO,
  DEFAULT_SITE_SETTINGS,
  INSTRUCTORS,
  SITE_LOCATIONS,
  SITE_NAME,
  TRAINING_PROGRAMS,
} from "@/lib/public-site";
import { absoluteUrl } from "@/lib/site-url";
import type { PublicFestival, PublicProfile, PublicSiteSettings } from "@/types/content";

import type { Metadata } from "next";

// Search and sharing metadata for the public website. The choices here follow Google's Search
// documentation: a self-referencing canonical on every page, a unique descriptive title and
// description per page, Open Graph tags for link previews, and structured data only for things
// that are actually on the page.

// The link-preview image, drawn by src/app/opengraph-image.tsx. It lives at the site root so its
// address is fixed; pages name it explicitly because a page that sets its own Open Graph fields
// does not inherit an image from a parent folder.
const SHARE_IMAGE_PATH = "/opengraph-image";
const SHARE_IMAGE = {
  url: SHARE_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — Indian classical and cinematic dance in ${SITE_LOCATIONS.join(" & ")}, Illinois`,
};

type JsonLd = Record<string, unknown>;

type PageMetadataInput = {
  /** The page's own title. The site name is appended by the layout's title template. */
  title: string;
  description: string;
  /** Path of the page, e.g. "/training". Also its canonical address. */
  path: string;
  /** Set when the title already contains the site name and must not get it appended again. */
  absoluteTitle?: boolean;
};

/**
 * Metadata for one public page. Open Graph fields are repeated per page because Next.js replaces
 * the whole `openGraph` object when a page sets it — nothing is inherited field by field.
 */
export function pageMetadata({ title, description, path, absoluteTitle = false }: PageMetadataInput): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      title: fullTitle,
      description,
      images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [SHARE_IMAGE] },
  };
}

// ---------- Structured data ----------

const ORGANIZATION_ID = absoluteUrl("/#organization");
const WEBSITE_ID = absoluteUrl("/#website");
const LOGO_URL = absoluteUrl("/images/client/logo.jpg");

const organizationRef = { "@id": ORGANIZATION_ID };

/** Images managed in the Content Portal are full addresses already; the site's own are paths. */
const imageUrl = (src: string) => (src.startsWith("/") ? absoluteUrl(src) : src);

/** The site name Google shows in results comes from this, and it must be on the home page. */
export function websiteJsonLd(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: absoluteUrl("/"),
    name: SITE_NAME,
    alternateName: "Malhaar",
    publisher: organizationRef,
    inLanguage: "en-US",
  };
}

/**
 * The company itself. Typed as a dance group that also teaches; the studio shows only its two
 * towns publicly, so the addresses carry town and state with no street line.
 *
 * The contact details and founders come from the Content Portal when they are managed there.
 */
export function organizationJsonLd(
  settings: PublicSiteSettings = DEFAULT_SITE_SETTINGS,
  founders: readonly { name: string }[] = INSTRUCTORS,
): JsonLd {
  return {
    "@type": ["DanceGroup", "EducationalOrganization"],
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: "Malhaar",
    url: absoluteUrl("/"),
    logo: LOGO_URL,
    image: absoluteUrl(SHARE_IMAGE_PATH),
    description: settings.seoDescription,
    email: settings.email,
    sameAs: settings.socialLinks.map((link) => link.href),
    founder: founders.map((founder) => ({ "@type": "Person", name: founder.name })),
    address: SITE_LOCATIONS.map((town) => ({
      "@type": "PostalAddress",
      addressLocality: town,
      addressRegion: "IL",
      addressCountry: "US",
    })),
    areaServed: [
      ...SITE_LOCATIONS.map((town) => ({ "@type": "City", name: `${town}, Illinois` })),
      { "@type": "AdministrativeArea", name: "Chicago metropolitan area" },
    ],
    knowsAbout: ["Bharatanatyam", "Mohiniyattam", "Kuchipudi", "Bollywood dance", "Semi Classical dance", "Indian classical dance"],
  };
}

/** Trail from Home to an inner page. Google needs at least two steps. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  };
}

export function instructorsJsonLd(profiles: readonly PublicProfile[]): JsonLd[] {
  return profiles.map((profile) => ({
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.title,
    description: profile.summary,
    ...(profile.photo && { image: imageUrl(profile.photo.src) }),
    worksFor: organizationRef,
    knowsAbout: [...profile.specializations],
  }));
}

export function trainingJsonLd(): JsonLd {
  return {
    "@type": "ItemList",
    name: "Dance training at Malhaar Dance Company",
    itemListElement: TRAINING_PROGRAMS.map((program, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Course",
        name: `${program.name} dance training`,
        description: program.description,
        provider: organizationRef,
      },
    })),
  };
}

/** One festival edition as an event. `startsAt` is the ISO date-time with its UTC offset. */
export function festivalJsonLd(edition: PublicFestival): JsonLd {
  return {
    "@type": "DanceEvent",
    name: `Malhaar Ananta Arts Festival ${edition.year}`,
    description: `${edition.summary} ${ANANTA_INTRO[1]}`,
    startDate: edition.startsAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: absoluteUrl(`/ananta/${edition.year}`),
    image: edition.posters.length > 0 ? edition.posters.map((poster) => imageUrl(poster.src)) : absoluteUrl(SHARE_IMAGE_PATH),
    location: {
      "@type": "Place",
      name: edition.venueName,
      address: {
        "@type": "PostalAddress",
        ...(edition.venueStreet && { streetAddress: edition.venueStreet }),
        addressLocality: edition.venueTown,
        addressRegion: edition.venueRegion,
        ...(edition.venuePostalCode && { postalCode: edition.venuePostalCode }),
        addressCountry: "US",
      },
    },
    performer: edition.artists.map((artist) => ({ "@type": "Person", name: artist.name })),
    organizer: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
  };
}

/** Wraps one or more nodes in a single schema.org graph. */
export const jsonLdGraph = (...nodes: JsonLd[]): JsonLd => ({ "@context": "https://schema.org", "@graph": nodes });
