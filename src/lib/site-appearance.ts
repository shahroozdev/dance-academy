import { HERO_PAGE_KEYS, HERO_THEME_KEYS, type HeroTheme, type HeroThemes } from "@/types/site-appearance";

export const DEFAULT_HERO_THEMES: HeroThemes = {
  about: "BLUSH",
  training: "GOLD",
  instructors: "VIOLET",
  performances: "ORCHID",
  festival: "PLUM",
  press: "CRIMSON",
  support: "SUNSET",
  contact: "ROSE",
};

export const HERO_THEME_OPTIONS = {
  BLUSH: "Blush",
  VIOLET: "Violet",
  GOLD: "Soft Gold",
  CRIMSON: "Crimson",
  PLUM: "Deep Plum",
  ORCHID: "Teal",
  SUNSET: "Sunset",
  ROSE: "Sage Green",
} satisfies Record<HeroTheme, string>;

/** Shared by public heroes and the Content Portal's colour previews. */
export const HERO_THEME_STYLES: Record<HeroTheme, { background: string; glow: string; ring: string }> = {
  BLUSH: {
    background: "from-hero-blush/75 via-secondary to-background",
    glow: "bg-hero-blush/45",
    ring: "border-hero-blush/60",
  },
  VIOLET: {
    background: "from-hero-violet/75 via-accent to-background",
    glow: "bg-hero-violet/45",
    ring: "border-hero-violet/60",
  },
  GOLD: {
    background: "from-hero-gold/75 via-muted to-secondary",
    glow: "bg-hero-gold/45",
    ring: "border-hero-gold/60",
  },
  CRIMSON: {
    background: "from-hero-crimson/75 via-primary/30 to-secondary",
    glow: "bg-hero-crimson/45",
    ring: "border-hero-crimson/60",
  },
  PLUM: {
    background: "from-hero-plum/80 via-chart-5/35 to-secondary",
    glow: "bg-hero-plum/50",
    ring: "border-hero-plum/60",
  },
  ORCHID: {
    background: "from-hero-orchid/80 via-muted to-secondary",
    glow: "bg-hero-orchid/50",
    ring: "border-hero-orchid/60",
  },
  SUNSET: {
    background: "from-hero-sunset/80 via-chart-1/35 to-secondary",
    glow: "bg-hero-sunset/50",
    ring: "border-hero-sunset/60",
  },
  ROSE: {
    background: "from-hero-rose/80 via-muted to-secondary",
    glow: "bg-hero-rose/50",
    ring: "border-hero-rose/60",
  },
};

/** Safely reads a possibly older/unconfigured website-settings row. */
export function readHeroThemes(value: unknown): HeroThemes {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_HERO_THEMES;
  const stored = value as Record<string, unknown>;
  return Object.fromEntries(
    HERO_PAGE_KEYS.map((key) => {
      const candidate = stored[key];
      return [key, typeof candidate === "string" && HERO_THEME_KEYS.includes(candidate as HeroTheme) ? candidate : DEFAULT_HERO_THEMES[key]];
    }),
  ) as HeroThemes;
}
