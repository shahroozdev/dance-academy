import Image from "next/image";

import type { HomeSectionId } from "@/lib/public-site";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  blush: "bg-linear-to-br from-secondary via-background to-muted",
  lilac: "bg-linear-to-bl from-accent via-background to-secondary",
  warm: "bg-linear-to-tr from-muted via-background to-secondary",
} as const;

// Where the soft colour wash and the thin ring sit; alternated so neighbouring sections differ.
const DECOR_CLASSES = {
  right: {
    glow: "-top-32 -right-32 bg-primary/15",
    ring: "-right-40 -bottom-40 border-primary/20",
  },
  left: {
    glow: "-bottom-32 -left-32 bg-chart-4/15",
    ring: "-top-40 -left-40 border-chart-4/20",
  },
  center: {
    glow: "top-1/4 left-1/3 bg-chart-1/15",
    ring: "-top-40 -right-40 border-chart-1/25",
  },
} as const;

// Each floral is a 16:10 picture whose flowers sit against one side and fade to nothing towards
// the other. It is fitted to the section's height, so on a screen wider than 16:10 it does not
// span the full width — it must be pinned to the side its flowers are on (`flowersOn`), or the
// picture's solid edge shows as a hard vertical line partway across the section.
const FLORALS = {
  rose: { src: "/images/site/classic-section-backround-3.png", flowersOn: "object-left" },
  lilac: { src: "/images/site/classic-section-backround-4.png", flowersOn: "object-right" },
  blossom: { src: "/images/site/classic-section-backround-5.png", flowersOn: "object-right" },
} as const;

const PANEL_FLORALS = {
  home: undefined,
  about: { floral: FLORALS.rose, className: "opacity-80" },
  training: { floral: FLORALS.lilac, className: "opacity-80" },
  instructors: { floral: FLORALS.blossom, className: "opacity-80" },
  performances: { floral: FLORALS.rose, className: "" },
  ananta: { floral: FLORALS.lilac, className: "opacity-80" },
  press: { floral: FLORALS.blossom, className: "opacity-80" },
  support: { floral: FLORALS.rose, className: "opacity-80" },
  contact: { floral: FLORALS.lilac, className: "opacity-80" },
} as const satisfies Record<HomeSectionId, { floral: (typeof FLORALS)[keyof typeof FLORALS]; className: string } | undefined>;

type PanelProps = {
  id: HomeSectionId;
  label: string;
  tone?: keyof typeof TONE_CLASSES;
  decor?: keyof typeof DECOR_CLASSES;
  className?: string;
  footer?: React.ReactNode;
  /** Full-bleed artwork placed against the section's own edges, outside the padded content box. */
  art?: React.ReactNode;
  children: React.ReactNode;
};

// One full-screen section of the home page.
export function Panel({ id, label, tone = "blush", decor = "right", className, footer, art, children }: PanelProps) {
  const decoration = DECOR_CLASSES[decor];
  const panelFloral = PANEL_FLORALS[id];
  return (
    <section
      id={id}
      aria-label={label}
      data-panel={id}
      className={cn("public-panel relative isolate flex min-h-dvh flex-col justify-center overflow-hidden", TONE_CLASSES[tone])}
    >
      <div aria-hidden="true" className={cn("pointer-events-none absolute -z-10 size-96 rounded-full blur-3xl", decoration.glow)} />
      <div aria-hidden="true" className={cn("pointer-events-none absolute -z-10 size-160 rounded-full border", decoration.ring)} />
      {panelFloral && (
        <Image
          src={panelFloral.floral.src}
          alt=""
          fill
          sizes="100vw"
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 z-0 object-contain",
            panelFloral.floral.flowersOn,
            panelFloral.className,
          )}
        />
      )}
      <div className={cn("relative z-10 mx-auto w-full max-w-7xl px-6 pt-28 pb-16 sm:px-10 lg:px-16 lg:pt-24 lg:pb-12", className)}>
        {children}
      </div>
      {art}
      {footer && <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-4 sm:px-10 lg:px-16">{footer}</div>}
    </section>
  );
}
