import Image from "next/image";

import { getPublicSiteMedia } from "@/actions/public-content";
import { Link } from "@/components/Link";
import { CtaLink } from "@/components/public/cta-link";
import { JsonLd } from "@/components/public/json-ld";
import { PageHero } from "@/components/public/page-hero";
import { PageSection } from "@/components/public/page-section";
import { SectionHeading } from "@/components/public/section-heading";
import { ABOUT_INTRO, ABOUT_PILLARS, ABOUT_STORY, ABOUT_VISION } from "@/lib/public-site";
import { breadcrumbJsonLd, jsonLdGraph, pageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "About Us — Our Story & Vision",
  description:
    "The story and vision of Malhaar Dance Company, an Indian dance company founded by sisters Sreevidhya Vijayan and Varsha Vijayan in the Chicagoland area.",
  path: "/about",
});

const BODY_CLASS = "font-public text-base leading-relaxed text-muted-foreground lg:text-lg";

export default async function AboutPage() {
  const { founders } = await getPublicSiteMedia();

  return (
    <>
      <JsonLd data={jsonLdGraph(breadcrumbJsonLd([{ name: "About", path: "/about" }]))} />
      <PageHero
        eyebrow="About Malhaar Dance Company"
        heading={[
          { text: "A shared" },
          { text: "Journey", accent: true },
          { text: "in dance" },
        ]}
        lead={ABOUT_INTRO}
      />

      <PageSection>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-full shadow-xl">
            <Image
              src={founders.src}
              alt={founders.alt}
              fill
              sizes="(min-width: 1024px) 28rem, 80vw"
              className="object-cover"
              style={{ objectPosition: founders.position }}
            />
          </div>
          <div className="flex flex-col gap-6">
            <SectionHeading
              parts={[
                { text: "Our" },
                { text: "Story", accent: true },
              ]}
            />
            {ABOUT_STORY.map((paragraph) => (
              <p key={paragraph} className={BODY_CLASS}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </PageSection>

      <PageSection tone="tint">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <SectionHeading
            parts={[
              { text: "Our" },
              { text: "Vision", accent: true },
            ]}
          />
          <p className={BODY_CLASS}>{ABOUT_VISION}</p>
        </div>
      </PageSection>

      <PageSection>
        <div className="flex flex-col items-center gap-10">
          <SectionHeading
            className="text-center"
            parts={[
              { text: "What Malhaar" },
              { text: "brings together", accent: true },
            ]}
          />
          <ul className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ABOUT_PILLARS.map((pillar) => (
              <li key={pillar.title}>
                <Link
                  href={pillar.href}
                  className="flex h-full items-center justify-center border border-primary/30 bg-card px-6 py-10 text-center font-public text-lg font-light tracking-wide text-foreground uppercase transition-colors hover:border-primary hover:text-primary"
                >
                  {pillar.title}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-center gap-3">
            <CtaLink href="/instructors">Meet the Founders</CtaLink>
            <CtaLink href="/training" variant="outline">
              Explore Training
            </CtaLink>
          </div>
        </div>
      </PageSection>
    </>
  );
}
