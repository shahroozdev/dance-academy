import { getPublicHeroThemes, getPublicProfiles } from "@/actions/public-content";
import { CtaLink } from "@/components/public/cta-link";
import { InstructorCards } from "@/components/public/instructor-cards";
import { JsonLd } from "@/components/public/json-ld";
import { PageHero } from "@/components/public/page-hero";
import { PageSection } from "@/components/public/page-section";
import { SectionHeading } from "@/components/public/section-heading";
import { breadcrumbJsonLd, instructorsJsonLd, jsonLdGraph, pageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Instructors — Sreevidhya Vijayan & Varsha Vijayan",
  description:
    "Meet Sreevidhya Vijayan and Varsha Vijayan, co-founders and instructors of Malhaar Dance Company, trained in Bharatanatyam, Mohiniyattam, Kuchipudi, and cinematic dance.",
  path: "/instructors",
});

export default async function InstructorsPage() {
  const [profiles, heroThemes] = await Promise.all([getPublicProfiles(), getPublicHeroThemes()]);

  return (
    <>
      <JsonLd
        data={jsonLdGraph(
          breadcrumbJsonLd([{ name: "Instructors", path: "/instructors" }]),
          ...instructorsJsonLd(profiles),
        )}
      />
      <PageHero
        theme={heroThemes.instructors}
        eyebrow="Instructors & Artistic Team"
        heading={[
          { text: "Meet the" },
          { text: "Founders", accent: true },
          { text: "& instructors" },
        ]}
        lead="Malhaar is led by two sisters whose training and performance experience spans Indian classical, contemporary, and cinematic dance."
      />

      {profiles.length > 0 && (
        <PageSection>
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-10">
            <SectionHeading
              className="text-center"
              parts={[
                { text: "Our" },
                { text: "Founders", accent: true },
              ]}
            />
            <InstructorCards instructors={profiles} />
          </div>
        </PageSection>
      )}

      <PageSection tone="tint">
        <div className="flex flex-wrap justify-center gap-3">
          <CtaLink href="/training">Explore Training</CtaLink>
          <CtaLink href="/register" variant="outline">
            Register for Classes
          </CtaLink>
        </div>
      </PageSection>
    </>
  );
}
