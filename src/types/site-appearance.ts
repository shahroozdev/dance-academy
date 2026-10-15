/** The public inner pages whose hero treatment a Content Owner may choose. */
export const HERO_PAGE_KEYS = ["about", "training", "instructors", "performances", "festival", "press", "support", "contact"] as const;
export type HeroPageKey = (typeof HERO_PAGE_KEYS)[number];

/** Curated styles preserve Malhaar's contrast and brand consistency. */
export const HERO_THEME_KEYS = ["BLUSH", "VIOLET", "GOLD", "CRIMSON", "PLUM", "ORCHID", "SUNSET", "ROSE"] as const;
export type HeroTheme = (typeof HERO_THEME_KEYS)[number];

export type HeroThemes = Record<HeroPageKey, HeroTheme>;
