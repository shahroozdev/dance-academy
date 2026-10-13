// Shapes shared by the Content Portal and the public website pages it feeds.

export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ContentRole = "OWNER" | "EDITOR";
export type MediaAssetKind = "IMAGE" | "VIDEO" | "DOCUMENT";

/** The content types that go through draft, publish, and archive. */
export const CONTENT_ENTITIES = ["festival", "performance", "press"] as const;
export type ContentEntity = (typeof CONTENT_ENTITIES)[number];

export type ContentActor = { id: string; name: string; role: ContentRole };

// ---------- What the public website is allowed to see ----------

export type PublicImage = {
  src: string;
  alt: string;
  /** CSS `object-position`, from the asset's focal point. */
  position?: string;
};

export type PublicFestivalArtist = {
  name: string;
  form: string;
  biography?: string | null;
  photo?: PublicImage | null;
};

export type PublicFestival = {
  year: string;
  label: string;
  date: string;
  time: string;
  /** The same start, as an ISO date-time with its UTC offset, for search engines. */
  startsAt: string;
  venue: string;
  venueName: string;
  venueTown: string;
  venueRegion: string;
  venueStreet?: string | null;
  venuePostalCode?: string | null;
  summary: string;
  ticketUrl: string | null;
  artists: readonly PublicFestivalArtist[];
  posters: readonly PublicImage[];
  gallery: readonly PublicImage[];
  videos: readonly { src: string; title: string }[];
  sponsors: readonly { name: string; logo: PublicImage; href: string | null }[];
};

export type PublicPerformance = {
  slug: string;
  title: string;
  date: string | null;
  venue: string | null;
  summary: string;
  description: string[];
  cover: PublicImage | null;
  videoUrl: string | null;
  externalUrl: string | null;
  gallery: (PublicImage & { caption: string | null })[];
};

export type PublicPressItem = {
  id: string;
  title: string;
  outlet: string | null;
  kind: string;
  date: string | null;
  excerpt: string | null;
  href: string | null;
  documentHref: string | null;
  image: PublicImage | null;
};

export type PublicProfile = {
  name: string;
  photo: PublicImage | null;
  title: string;
  specializations: readonly string[];
  summary: string;
  biography: readonly string[];
};

/** The file shown in each fixed place on the website, by slot key (src/lib/site-media.ts). */
export type PublicSiteMedia = Record<string, PublicImage>;

export type PublicSocialLink = { href: string; label: "Facebook" | "Instagram" };

export type PublicSiteSettings = {
  email: string;
  phone: string;
  whatsappUrl: string | null;
  socialLinks: PublicSocialLink[];
  seoDescription: string;
  homeIntro: string;
};
