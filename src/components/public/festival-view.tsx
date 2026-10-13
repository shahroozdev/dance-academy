import Image from "next/image";

import { Link } from "@/components/Link";
import { CtaLink } from "@/components/public/cta-link";
import { PageHero } from "@/components/public/page-hero";
import { PageSection } from "@/components/public/page-section";
import { PublicVideo } from "@/components/public/public-video";
import { SectionHeading } from "@/components/public/section-heading";
import { ANANTA_FUTURE, ANANTA_INTEREST, ANANTA_INTRO, inquiryHref } from "@/lib/public-site";
import { cn } from "@/lib/utils";
import type { PublicFestival, PublicImage } from "@/types/content";

const BODY_CLASS = "font-public text-base leading-relaxed text-muted-foreground lg:text-lg";

type FestivalViewProps = {
  edition: PublicFestival;
  /** Every published year, for the year switcher. */
  years: readonly string[];
  contactEmail: string;
};

function PosterGrid({ images, aspectClass }: { images: readonly PublicImage[]; aspectClass: string }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {images.map((image) => (
        <div key={image.src} className={cn("relative overflow-hidden bg-card shadow-sm", aspectClass)}>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 640px) 30rem, 90vw"
            className="object-cover"
            style={{ objectPosition: image.position }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * The whole of one festival edition's page below the site header. Rendered by the public page
 * for published editions and by the Content Portal's preview for drafts, so both always match.
 */
export function FestivalView({ edition, years, contactEmail }: FestivalViewProps) {
  const hasHighlights = edition.posters.length + edition.gallery.length + edition.videos.length > 0;

  return (
    <>
      <PageHero
        eyebrowInHeading={false}
        eyebrow={`Presented by Malhaar Dance Company · ${edition.label}`}
        heading={[
          { text: "Malhaar", breakAfter: true },
          { text: "Ananta", accent: true },
          { text: "Arts Festival", breakAfter: true },
          { text: edition.year, accent: true },
        ]}
        lead={ANANTA_INTRO[0]}
      >
        <p className="font-public text-xl font-light text-foreground">
          {edition.date} · {edition.time}
        </p>
        <p className="font-public text-muted-foreground">{edition.venue}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {edition.ticketUrl && <CtaLink href={edition.ticketUrl}>Book Tickets</CtaLink>}
          <CtaLink href="#artists" variant="outline">
            Meet the Artists
          </CtaLink>
          <CtaLink href={inquiryHref(ANANTA_INTEREST)} variant="outline">
            Become a Sponsor
          </CtaLink>
        </div>
        {years.length > 0 && (
          <nav aria-label="Festival years">
            <ul className="flex flex-wrap justify-center gap-2">
              {years.map((year) => (
                <li key={year}>
                  <Link
                    href={`/ananta/${year}`}
                    aria-current={year === edition.year ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center border px-4 font-condensed text-sm tracking-widest uppercase transition-colors",
                      year === edition.year
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary/30 text-foreground hover:border-primary hover:text-primary",
                    )}
                  >
                    Ananta {year}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </PageHero>

      <PageSection>
        <div className="mx-auto flex max-w-3xl flex-col gap-6 text-center">
          <SectionHeading
            parts={[
              { text: "About the" },
              { text: "Festival", accent: true },
            ]}
          />
          {ANANTA_INTRO.slice(1).map((paragraph) => (
            <p key={paragraph} className={BODY_CLASS}>
              {paragraph}
            </p>
          ))}
        </div>
      </PageSection>

      {hasHighlights && (
        <PageSection tone="tint">
          <div className="mx-auto flex max-w-5xl flex-col gap-8">
            <SectionHeading
              className="text-center"
              parts={[
                { text: "Festival" },
                { text: "Highlights", accent: true },
              ]}
            />
            {edition.posters.length > 0 && <PosterGrid images={edition.posters} aspectClass="aspect-3/4" />}
            {edition.gallery.length > 0 && <PosterGrid images={edition.gallery} aspectClass="aspect-4/3" />}
            {edition.videos.map((video) => (
              <PublicVideo key={video.src} src={video.src} title={video.title} />
            ))}
          </div>
        </PageSection>
      )}

      <PageSection tone="tint">
        <div id="artists" className="flex scroll-mt-28 flex-col items-center gap-10">
          <SectionHeading
            className="text-center"
            parts={[
              { text: "Featured" },
              { text: "Artists", accent: true },
            ]}
          />
          <ul className="grid w-full max-w-4xl gap-6 sm:grid-cols-2">
            {edition.artists.map((artist) => (
              <li key={artist.name} className="flex flex-col items-center gap-2 bg-card px-6 py-10 text-center shadow-sm">
                {artist.photo && (
                  <div className="relative mb-4 aspect-square w-40 overflow-hidden rounded-full">
                    <Image
                      src={artist.photo.src}
                      alt={artist.photo.alt}
                      fill
                      sizes="10rem"
                      className="object-cover"
                      style={{ objectPosition: artist.photo.position }}
                    />
                  </div>
                )}
                <h3 className="font-public text-2xl font-light tracking-wide text-foreground uppercase">{artist.name}</h3>
                <p className="font-display text-xl text-primary italic">{artist.form}</p>
                {artist.biography && (
                  <p className="mt-2 font-public text-sm leading-relaxed text-muted-foreground">{artist.biography}</p>
                )}
              </li>
            ))}
          </ul>
          <p className={cn(BODY_CLASS, "max-w-3xl text-center")}>{edition.summary}</p>
        </div>
      </PageSection>

      <PageSection>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-4 border border-primary/30 bg-card p-8">
            <h2 className="font-public text-xl font-light tracking-wide text-foreground uppercase">Sponsors & Supporters</h2>
            {edition.sponsors.length > 0 && (
              <ul className="flex flex-wrap items-center gap-4" aria-label="Festival sponsors">
                {edition.sponsors.map((sponsor) => {
                  const logo = (
                    <span className="relative block h-16 w-32">
                      <Image
                        src={sponsor.logo.src}
                        alt={sponsor.name}
                        fill
                        sizes="8rem"
                        className="object-contain"
                      />
                    </span>
                  );
                  return (
                    <li key={sponsor.logo.src}>
                      {sponsor.href ? (
                        <a href={sponsor.href} target="_blank" rel="noreferrer">
                          {logo}
                        </a>
                      ) : (
                        logo
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="font-public text-sm leading-relaxed text-muted-foreground">
              Help bring distinguished artists and live music to our community by supporting the festival.
            </p>
            <CtaLink href={inquiryHref(ANANTA_INTEREST)} variant="outline" className="mt-auto">
              Become a Sponsor
            </CtaLink>
          </div>
          <div className="flex flex-col items-start gap-4 border border-primary/30 bg-card p-8">
            <h2 className="font-public text-xl font-light tracking-wide text-foreground uppercase">Festival Contact</h2>
            <p className="font-public text-sm leading-relaxed text-muted-foreground">
              For questions about the festival, artists, or media, write to us.
            </p>
            <a href={`mailto:${contactEmail}`} className="mt-auto font-display text-lg text-primary italic hover:underline">
              {contactEmail}
            </a>
          </div>
        </div>
      </PageSection>

      <PageSection tone="tint">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <SectionHeading
            parts={[
              { text: "More than a" },
              { text: "single event", accent: true },
            ]}
          />
          <p className={BODY_CLASS}>{ANANTA_FUTURE}</p>
        </div>
      </PageSection>
    </>
  );
}
