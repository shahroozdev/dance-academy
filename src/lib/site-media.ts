import { HOME_SECTIONS, TRAINING_PROGRAMS, siteImage, siteVideo, type HomeSectionId } from "@/lib/public-site";
import type { MediaAssetKind } from "@/types/content";

// The fixed places on the website whose picture or video can be chosen in the Content Portal
// (Website Settings). Each has the site's original file in the bucket as its fallback, shown until a
// Media Library file is chosen for it and whenever the portal's content cannot be read.

type SlotDefinition = {
  key: string;
  label: string;
  kind: Extract<MediaAssetKind, "IMAGE" | "VIDEO">;
  fallbackSrc: string;
  fallbackAlt: string;
};

const trainingSlotKey = (programName: string) => `training-${programName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

// Each floral is a 16:10 picture whose flowers sit against one side and fade to nothing towards
// the other. It covers the whole section, so on a screen taller than 16:10 part of its width is
// cropped — it is pinned to the side its flowers are on so the crop takes the empty side.
const FLORALS = {
  rose: { src: "/images/site/classic-section-backround-3.png", flowersOn: "object-left" },
  lilac: { src: "/images/site/classic-section-backround-4.png", flowersOn: "object-right" },
  blossom: { src: "/images/site/classic-section-backround-5.png", flowersOn: "object-right" },
} as const;

/** The original background of each home page section. The opening section has its video instead. */
export const HOME_BACKGROUNDS: Partial<Record<HomeSectionId, (typeof FLORALS)[keyof typeof FLORALS]>> = {
  about: FLORALS.rose,
  training: FLORALS.lilac,
  instructors: FLORALS.blossom,
  performances: FLORALS.rose,
  ananta: FLORALS.lilac,
  press: FLORALS.blossom,
  support: FLORALS.rose,
  careers: FLORALS.blossom,
  contact: FLORALS.lilac,
};

const HOME_BACKGROUND_PREFIX = "home-background-";

/** The slot holding a home page section's background. */
export const homeBackgroundSlot = (sectionId: HomeSectionId) => `${HOME_BACKGROUND_PREFIX}${sectionId}`;

/** Backgrounds stay in the site's own files until an owner chooses otherwise, so they are not seeded. */
export const isHomeBackgroundSlot = (key: string) => key.startsWith(HOME_BACKGROUND_PREFIX);

export const SITE_MEDIA_SLOTS = [
  {
    key: "home-intro-video",
    label: "Home page opening video",
    kind: "VIDEO",
    fallbackSrc: siteVideo("malhaar-intro.mp4"),
    fallbackAlt: "Malhaar Dance Company introduction",
  },
  {
    key: "home-intro-poster",
    label: "Home page opening still (shown while the video loads)",
    kind: "IMAGE",
    fallbackSrc: siteImage("client/performance-stage-wide-1.jpg"),
    fallbackAlt: "Malhaar students performing on stage",
  },
  {
    key: "founders",
    label: "Founders photo (home and About pages)",
    kind: "IMAGE",
    fallbackSrc: siteImage("client/founders.jpg"),
    fallbackAlt: "Sreevidhya Vijayan and Varsha Vijayan, founders of Malhaar Dance Company",
  },
  ...TRAINING_PROGRAMS.map((program) => ({
    key: trainingSlotKey(program.name),
    label: `Training: ${program.name}`,
    kind: "IMAGE" as const,
    fallbackSrc: program.image,
    fallbackAlt: program.imageAlt,
  })),
  ...HOME_SECTIONS.flatMap((section) => {
    const background = HOME_BACKGROUNDS[section.id];
    return background
      ? [
          {
            key: homeBackgroundSlot(section.id),
            label: `Home page background: ${section.label}`,
            kind: "IMAGE" as const,
            fallbackSrc: background.src,
            fallbackAlt: "",
          },
        ]
      : [];
  }),
] satisfies SlotDefinition[];

export const SITE_MEDIA_SLOT_KEYS = SITE_MEDIA_SLOTS.map((slot) => slot.key);

/** The slot showing a training program's picture. */
export const trainingSlot = trainingSlotKey;

export const findSiteMediaSlot = (key: string) => SITE_MEDIA_SLOTS.find((slot) => slot.key === key);
