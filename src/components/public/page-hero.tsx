import { SectionHeading, type HeadingPart } from "@/components/public/section-heading";
import { HERO_THEME_STYLES } from "@/lib/site-appearance";
import { cn } from "@/lib/utils";
import type { HeroTheme } from "@/types/site-appearance";

const EYEBROW_CLASS = "font-condensed text-sm font-normal tracking-widest text-primary uppercase";

type PageHeroProps = {
  /** The small label above the headline. Names the page's topic, e.g. "Dance Training". */
  eyebrow: string;
  heading: HeadingPart[];
  lead?: string;
  /**
   * Whether the label is part of the page's main heading (the default). The headline is often a
   * phrase like "More than Choreography" that doesn't say what the page is about, so the label
   * supplies the topic for search engines and screen readers. Turn it off when the headline
   * already names the topic.
   */
  eyebrowInHeading?: boolean;
  children?: React.ReactNode;
  theme?: HeroTheme;
  /** Lift a title where the page's composition benefits from a more prominent hero. */
  titlePlacement?: "default" | "raised";
};

const TITLE_PLACEMENT_CLASSES = { default: "pt-32 lg:pt-44", raised: "pt-24 lg:pt-36" } as const;

// The opening band of every inner page: small label, the mixed-type headline, and a lead line.
export function PageHero({ eyebrow, heading, lead, eyebrowInHeading = true, children, theme = "BLUSH", titlePlacement = "default" }: PageHeroProps) {
  const styles = HERO_THEME_STYLES[theme];

  return (
    <section className={cn("relative isolate overflow-hidden bg-linear-to-br", styles.background)}>
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute -top-32 -right-32 -z-10 size-96 rounded-full blur-3xl", styles.glow)}
      />
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute -bottom-72 -left-40 -z-10 size-160 rounded-full border", styles.ring)}
      />
      {/* Extra top padding: the transparent site header floats over this band. */}
      <div className={cn("mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 pb-16 text-center sm:px-10 lg:pb-24", TITLE_PLACEMENT_CLASSES[titlePlacement])}>
        {eyebrowInHeading ? (
          <h1 className="flex flex-col items-center gap-6">
            <span className={EYEBROW_CLASS}>{eyebrow}</span>
            <SectionHeading as="span" size="hero" parts={heading} className="block" />
          </h1>
        ) : (
          <>
            <p className={EYEBROW_CLASS}>{eyebrow}</p>
            <SectionHeading as="h1" size="hero" parts={heading} />
          </>
        )}
        {lead && <p className="font-public text-base leading-relaxed text-muted-foreground lg:text-lg">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
