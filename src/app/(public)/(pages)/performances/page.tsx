import Image from "next/image";

import { getPublicPerformances } from "@/actions/public-content";
import { Link } from "@/components/Link";
import { CtaLink } from "@/components/public/cta-link";
import { JsonLd } from "@/components/public/json-ld";
import { PageHero } from "@/components/public/page-hero";
import { PageSection } from "@/components/public/page-section";
import { SectionHeading } from "@/components/public/section-heading";
import { PERFORMANCE_KINDS, PERFORMANCE_PHOTOS, PERFORMANCES_INTRO, inquiryHref } from "@/lib/public-site";
import { breadcrumbJsonLd, jsonLdGraph, pageMetadata } from "@/lib/seo";
import type { PublicImage, PublicPerformance } from "@/types/content";

import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Indian Dance Performances & Productions",
  description:
    "Productions, professional performances, collaborations, cultural programs, festivals, and student performances by Malhaar Dance Company. Book a performance for your event.",
  path: "/performances",
});

/** The performances published in the Content Portal, each linking to its own page. */
function PerformanceCards({ performances }: { performances: PublicPerformance[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {performances.map((performance) => (
        <li key={performance.slug}>
          <Link
            href={`/performances/${performance.slug}`}
            className="group flex h-full flex-col bg-card shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {performance.cover && (
              <div className="relative aspect-4/3 overflow-hidden">
                <Image
                  src={performance.cover.src}
                  alt={performance.cover.alt}
                  fill
                  sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  style={{ objectPosition: performance.cover.position }}
                />
              </div>
            )}
            <div className="flex flex-1 flex-col gap-3 p-6">
              <h2 className="font-public text-xl font-light tracking-wide text-foreground uppercase">{performance.title}</h2>
              {(performance.date || performance.venue) && (
                <p className="font-display text-primary italic">
                  {[performance.date, performance.venue].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="font-public text-sm leading-relaxed text-muted-foreground">{performance.summary}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The page's photo grid: every gallery photo of the published performances, newest first. */
function PerformancePhotoGrid({ photos }: { photos: readonly PublicImage[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-label="Performance photos">
      {photos.map((photo, index) => (
        <li
          key={photo.src}
          className={
            index === 0
              ? "relative col-span-2 aspect-video overflow-hidden shadow-sm"
              : "relative aspect-square overflow-hidden shadow-sm"
          }
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes={index === 0 ? "(min-width: 1024px) 60rem, 90vw" : "(min-width: 1024px) 20rem, 45vw"}
            className="object-cover transition-transform duration-500 hover:scale-105"
            style={{ objectPosition: photo.position }}
          />
        </li>
      ))}
    </ul>
  );
}

export default async function PerformancesPage() {
  const performances = await getPublicPerformances();
  // A performance appears as a card once it has a cover image; its gallery photos always join
  // the grid. The built-in photos are only used when the portal's content cannot be read.
  const featured = performances.filter((performance) => performance.cover);
  const galleryPhotos = performances.flatMap((performance) => performance.gallery);
  const photos = galleryPhotos.length > 0 ? galleryPhotos : PERFORMANCE_PHOTOS;

  return (
    <>
      <JsonLd data={jsonLdGraph(breadcrumbJsonLd([{ name: "Performances", path: "/performances" }]))} />
      <PageHero
        eyebrow="Performances"
        heading={[
          { text: "From training" },
          { text: "to the Stage", accent: true },
        ]}
        lead={PERFORMANCES_INTRO[0]}
      />

      <PageSection>
        <div className="flex flex-col gap-10">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <p className="font-public text-base leading-relaxed text-muted-foreground lg:text-lg">
              {PERFORMANCES_INTRO[1]}
            </p>
            <ul className="flex flex-wrap justify-center gap-3">
              {PERFORMANCE_KINDS.map((kind) => (
                <li
                  key={kind}
                  className="border border-primary/30 bg-card px-4 py-2 font-condensed text-sm tracking-widest text-foreground uppercase"
                >
                  {kind}
                </li>
              ))}
            </ul>
          </div>
          {featured.length > 0 && <PerformanceCards performances={featured} />}
          {(galleryPhotos.length > 0 || featured.length === 0) && <PerformancePhotoGrid photos={photos} />}
        </div>
      </PageSection>

      <PageSection tone="tint">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <SectionHeading
            parts={[
              { text: "Invite Malhaar" },
              { text: "to perform", accent: true },
            ]}
          />
          <p className="font-public text-base leading-relaxed text-muted-foreground lg:text-lg">
            For performance bookings, cultural programs, and collaborations, send us a message.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <CtaLink href={inquiryHref("Performance Booking")}>Book a Performance</CtaLink>
            <CtaLink href={inquiryHref("Collaboration")} variant="outline">
              Collaborate With Us
            </CtaLink>
          </div>
        </div>
      </PageSection>
    </>
  );
}
