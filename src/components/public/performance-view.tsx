import Image from "next/image";

import { CtaLink } from "@/components/public/cta-link";
import { PageHero } from "@/components/public/page-hero";
import { PageSection } from "@/components/public/page-section";
import { PublicVideo } from "@/components/public/public-video";
import { inquiryHref } from "@/lib/public-site";
import type { PublicPerformance } from "@/types/content";

const BODY_CLASS = "font-public text-base leading-relaxed text-muted-foreground lg:text-lg";

/**
 * One performance's page below the site header. Rendered by the public page for published
 * performances and by the Content Portal's preview for drafts, so both always match.
 */
export function PerformanceView({ performance }: { performance: PublicPerformance }) {
  const details = [performance.date, performance.venue].filter(Boolean).join(" · ");

  return (
    <>
      <PageHero eyebrow="Performances" heading={[{ text: performance.title }]} lead={performance.summary}>
        {details && <p className="font-public text-xl font-light text-foreground">{details}</p>}
      </PageHero>

      <PageSection>
        <div className="mx-auto flex max-w-4xl flex-col gap-10">
          {performance.cover && (
            <div className="relative aspect-video overflow-hidden shadow-sm">
              <Image
                src={performance.cover.src}
                alt={performance.cover.alt}
                fill
                priority
                sizes="(min-width: 1024px) 56rem, 90vw"
                className="object-cover"
                style={{ objectPosition: performance.cover.position }}
              />
            </div>
          )}
          {performance.description.length > 0 && (
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              {performance.description.map((paragraph) => (
                <p key={paragraph} className={BODY_CLASS}>
                  {paragraph}
                </p>
              ))}
            </div>
          )}
          {performance.videoUrl && <PublicVideo src={performance.videoUrl} title={performance.title} />}
          {performance.externalUrl && (
            <a
              href={performance.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-center font-display text-lg text-primary italic hover:underline"
            >
              Read more about this performance
            </a>
          )}
        </div>
      </PageSection>

      {performance.gallery.length > 0 && (
        <PageSection tone="tint">
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-label="Performance photos">
            {performance.gallery.map((photo) => (
              <li key={photo.src} className="flex flex-col gap-2">
                <div className="relative aspect-square overflow-hidden shadow-sm">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(min-width: 1024px) 20rem, 45vw"
                    className="object-cover"
                    style={{ objectPosition: photo.position }}
                  />
                </div>
                {photo.caption && <p className="font-public text-sm text-muted-foreground">{photo.caption}</p>}
              </li>
            ))}
          </ul>
        </PageSection>
      )}

      <PageSection>
        <div className="flex flex-wrap justify-center gap-3">
          <CtaLink href="/performances" variant="outline">
            All Performances
          </CtaLink>
          <CtaLink href={inquiryHref("Performance Booking")}>Book a Performance</CtaLink>
        </div>
      </PageSection>
    </>
  );
}
