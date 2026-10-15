import Image from "next/image";

import { getPublicHeroThemes, getPublicSiteMedia } from "@/actions/public-content";
import { CtaLink } from "@/components/public/cta-link";
import { JsonLd } from "@/components/public/json-ld";
import { PageHero } from "@/components/public/page-hero";
import { PageSection } from "@/components/public/page-section";
import { SectionHeading } from "@/components/public/section-heading";
import { SITE_LOCATIONS, TRAINING_AVAILABILITY, TRAINING_INTRO, TRAINING_PROGRAMS } from "@/lib/public-site";
import { breadcrumbJsonLd, jsonLdGraph, pageMetadata, trainingJsonLd } from "@/lib/seo";
import { trainingSlot } from "@/lib/site-media";
import { cn } from "@/lib/utils";

import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Bharatanatyam, Mohiniyattam & Bollywood Dance Training",
  description:
    "Bharatanatyam, Mohiniyattam, and Bollywood/Cinematic dance training at Malhaar Dance Company in Wood Dale and Elgin, Illinois. Contact us for current class availability, levels, and schedules.",
  path: "/training",
});

const BODY_CLASS = "font-public text-base leading-relaxed text-muted-foreground lg:text-lg";

export default async function TrainingPage() {
  const [siteMedia, heroThemes] = await Promise.all([getPublicSiteMedia(), getPublicHeroThemes()]);

  return (
    <>
      <JsonLd data={jsonLdGraph(breadcrumbJsonLd([{ name: "Training", path: "/training" }]), trainingJsonLd())} />
      <PageHero
        theme={heroThemes.training}
        eyebrow="Dance Training"
        heading={[
          { text: "More than" },
          { text: "Choreography", accent: true },
        ]}
        lead={TRAINING_INTRO}
      />

      {TRAINING_PROGRAMS.map((program, index) => (
        <PageSection key={program.name} tone={index % 2 === 0 ? "plain" : "tint"}>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Alternate the photo side so the three forms read as a rhythm, not a list. */}
            <div className={cn("relative aspect-4/3 overflow-hidden shadow-xl", index % 2 === 1 && "lg:order-last")}>
              <Image
                src={siteMedia[trainingSlot(program.name)].src}
                alt={siteMedia[trainingSlot(program.name)].alt}
                fill
                sizes="(min-width: 1024px) 45vw, 90vw"
                className="object-cover"
                style={{ objectPosition: siteMedia[trainingSlot(program.name)].position }}
              />
            </div>
            <div className="flex flex-col items-start gap-6">
              <h2 className="font-public text-3xl font-light tracking-wide text-foreground uppercase sm:text-4xl">
                {program.name}
              </h2>
              {"audience" in program && (
                <p className="font-condensed text-sm tracking-widest text-primary uppercase">{program.audience}</p>
              )}
              <p className={BODY_CLASS}>{program.description}</p>
              <CtaLink href="/register">Register for {program.name}</CtaLink>
            </div>
          </div>
        </PageSection>
      ))}

      <PageSection tone="tint">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <SectionHeading
            parts={[
              { text: "Join us in" },
              { text: SITE_LOCATIONS.join(" & "), accent: true },
            ]}
          />
          <p className={BODY_CLASS}>{TRAINING_AVAILABILITY}</p>
          <CtaLink href="/register">Register for Classes</CtaLink>
        </div>
      </PageSection>
    </>
  );
}
