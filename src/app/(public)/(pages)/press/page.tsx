import Image from "next/image";

import { getPublicHeroThemes, getPublicPressItems, getPublicSiteSettings } from "@/actions/public-content";
import { CtaLink } from "@/components/public/cta-link";
import { JsonLd } from "@/components/public/json-ld";
import { PageHero } from "@/components/public/page-hero";
import { PageSection } from "@/components/public/page-section";
import { SectionHeading } from "@/components/public/section-heading";
import { PRESS_INTRO, PRESS_KINDS, inquiryHref } from "@/lib/public-site";
import { breadcrumbJsonLd, jsonLdGraph, pageMetadata } from "@/lib/seo";
import type { PublicPressItem } from "@/types/content";

import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Press & Media Coverage",
  description:
    "Press coverage, interviews, articles, performance features, and media highlights of Malhaar Dance Company, with contact details for media inquiries.",
  path: "/press",
});

const PRESS_LINK_CLASS = "font-condensed text-sm font-semibold tracking-widest text-primary uppercase hover:underline";

/** The press items published in the Content Portal, newest first. */
function PressItems({ items }: { items: PublicPressItem[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col bg-card shadow-sm">
          {item.image && (
            <div className="relative aspect-4/3 overflow-hidden">
              <Image
                src={item.image.src}
                alt={item.image.alt}
                fill
                sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
                className="object-cover"
                style={{ objectPosition: item.image.position }}
              />
            </div>
          )}
          <div className="flex flex-1 flex-col gap-3 p-6">
            <p className="font-condensed text-xs tracking-widest text-primary uppercase">{item.kind}</p>
            <h2 className="font-public text-xl font-light tracking-wide text-foreground">{item.title}</h2>
            {(item.outlet || item.date) && (
              <p className="font-display text-primary italic">{[item.outlet, item.date].filter(Boolean).join(" · ")}</p>
            )}
            {item.excerpt && <p className="font-public text-sm leading-relaxed text-muted-foreground">{item.excerpt}</p>}
            <div className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-2">
              {item.href && (
                <a href={item.href} target="_blank" rel="noreferrer" className={PRESS_LINK_CLASS}>
                  Read or Watch
                </a>
              )}
              {item.documentHref && (
                <a href={item.documentHref} target="_blank" rel="noreferrer" className={PRESS_LINK_CLASS}>
                  Open PDF
                </a>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function PressPage() {
  const [items, settings, heroThemes] = await Promise.all([getPublicPressItems(), getPublicSiteSettings(), getPublicHeroThemes()]);

  return (
    <>
      <JsonLd data={jsonLdGraph(breadcrumbJsonLd([{ name: "Press & Media", path: "/press" }]))} />
      <PageHero
        theme={heroThemes.press}
        eyebrow="Press & Media"
        heading={[
          { text: "Malhaar" },
          { text: "in the Press", accent: true },
          { text: "& media" },
        ]}
        lead={PRESS_INTRO}
      />

      <PageSection>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PRESS_KINDS.map((kind) => (
            <li
              key={kind}
              className="flex items-center justify-center border border-primary/30 bg-card px-4 py-8 text-center font-condensed text-sm tracking-widest text-foreground uppercase"
            >
              {kind}
            </li>
          ))}
        </ul>
      </PageSection>

      {items.length > 0 && (
        <PageSection>
          <PressItems items={items} />
        </PageSection>
      )}

      <PageSection tone="tint">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <SectionHeading
            parts={[
              { text: "Media & press" },
              { text: "Inquiries", accent: true },
            ]}
          />
          <a href={`mailto:${settings.email}`} className="font-display text-2xl text-primary italic hover:underline">
            {settings.email}
          </a>
          <CtaLink href={inquiryHref("Media/Press")}>Send a Media Inquiry</CtaLink>
        </div>
      </PageSection>
    </>
  );
}
