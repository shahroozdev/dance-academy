import { SectionHeading, type HeadingPart } from "@/components/public/section-heading";

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
};

// The opening band of every inner page: small label, the mixed-type headline, and a lead line.
export function PageHero({ eyebrow, heading, lead, eyebrowInHeading = true, children }: PageHeroProps) {
  return (
    <section className="relative isolate overflow-hidden bg-linear-to-br from-secondary via-background to-accent">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-32 -z-10 size-96 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-72 -left-40 -z-10 size-160 rounded-full border border-chart-4/20"
      />
      {/* Extra top padding: the transparent site header floats over this band. */}
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 pt-32 pb-16 text-center sm:px-10 lg:pt-44 lg:pb-24">
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
