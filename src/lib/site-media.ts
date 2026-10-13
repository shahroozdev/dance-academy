import { TRAINING_PROGRAMS, siteImage, siteVideo } from "@/lib/public-site";
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
] satisfies SlotDefinition[];

export const SITE_MEDIA_SLOT_KEYS = SITE_MEDIA_SLOTS.map((slot) => slot.key);

/** The slot showing a training program's picture. */
export const trainingSlot = trainingSlotKey;

export const findSiteMediaSlot = (key: string) => SITE_MEDIA_SLOTS.find((slot) => slot.key === key);
