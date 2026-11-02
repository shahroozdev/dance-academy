import { GENERAL_APPLICATION } from "@/actions/inquiries.schema";
import { getPublicHeroThemes, getPublicJobOpenings, getPublicSiteSettings } from "@/actions/public-content";
import { CtaLink } from "@/components/public/cta-link";
import { JobApplicationForm } from "@/components/public/job-application-form";
import { JsonLd } from "@/components/public/json-ld";
import { PageHero } from "@/components/public/page-hero";
import { PageSection } from "@/components/public/page-section";
import { SectionHeading } from "@/components/public/section-heading";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { CAREERS_INTRO } from "@/lib/public-site";
import { breadcrumbJsonLd, jsonLdGraph, pageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

// The canonical address is /careers, so the Apply links (/careers?position=…) are not treated as
// separate pages.
export const metadata: Metadata = pageMetadata({
  title: "Careers",
  description: "Open positions at Malhaar Dance Company in Wood Dale and Elgin, Illinois, and how to apply.",
  path: "/careers",
});

const APPLY_ID = "apply";

export default async function CareersPage({ searchParams }: PageProps<"/careers">) {
  const [{ position }, jobs, settings, heroThemes] = await Promise.all([
    searchParams,
    getPublicJobOpenings(),
    getPublicSiteSettings(),
    getPublicHeroThemes(),
  ]);
  const chosenPosition = jobs.find((job) => job.id === position)?.id ?? jobs.at(0)?.id ?? GENERAL_APPLICATION;

  return (
    <>
      <JsonLd data={jsonLdGraph(breadcrumbJsonLd([{ name: "Careers", path: "/careers" }]))} />
      <PageHero theme={heroThemes.careers} eyebrow="Careers" heading={[{ text: "Join our Team" }]} lead={CAREERS_INTRO} />

      <PageSection>
        {jobs.length > 0 ? (
          <ul className="mx-auto flex max-w-3xl flex-col gap-6">
            {jobs.map((job) => (
              <li key={job.id} className="flex flex-col items-start gap-4 bg-card p-8 shadow-sm">
                <h2 className="font-display text-2xl text-foreground italic sm:text-3xl">{job.title}</h2>
                {(job.location || job.employmentType) && (
                  <p className="font-condensed text-sm tracking-widest text-primary uppercase">
                    {[job.location, job.employmentType].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="font-public leading-relaxed whitespace-pre-line text-muted-foreground">{job.description}</p>
                <CtaLink href={job.applyUrl ?? `/careers?position=${job.id}#${APPLY_ID}`}>Apply</CtaLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mx-auto max-w-3xl text-center font-public text-base leading-relaxed text-muted-foreground lg:text-lg">
            There are no open positions right now. You are welcome to send a general application below.
          </p>
        )}
      </PageSection>

      <PageSection tone="tint">
        <div id={APPLY_ID} className="mx-auto flex max-w-3xl scroll-mt-24 flex-col gap-8">
          <SectionHeading className="text-center" parts={[{ text: "Apply to Malhaar" }]} />
          {/* Keyed by the position so choosing another opening's Apply button starts the form afresh. */}
          <JobApplicationForm
            key={chosenPosition}
            positions={jobs.map((job) => ({ id: job.id, title: job.title }))}
            defaultPosition={chosenPosition}
            acceptsResume={isCloudinaryConfigured()}
            contactEmail={settings.email}
          />
        </div>
      </PageSection>
    </>
  );
}
