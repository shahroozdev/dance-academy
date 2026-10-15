import { getPublicHeroThemes } from "@/actions/public-content";
import { CtaLink } from "@/components/public/cta-link";
import { JsonLd } from "@/components/public/json-ld";
import { PageHero } from "@/components/public/page-hero";
import { PageSection } from "@/components/public/page-section";
import { SectionHeading } from "@/components/public/section-heading";
import { SUPPORT_INTRO, inquiryHref } from "@/lib/public-site";
import { breadcrumbJsonLd, jsonLdGraph, pageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Support, Sponsorship & Partnerships",
  description:
    "Support Malhaar Dance Company through sponsorship, festival sponsorship, partnerships, collaborations, community support, or volunteering.",
  path: "/support",
});

export default async function SupportPage() {
  const heroThemes = await getPublicHeroThemes();
  return (
    <>
      <JsonLd data={jsonLdGraph(breadcrumbJsonLd([{ name: "Support", path: "/support" }]))} />
      <PageHero
        theme={heroThemes.support}
        eyebrow="Support Malhaar"
        heading={[
          { text: "Help keep the" },
          { text: "Arts thriving", accent: true },
        ]}
        lead={SUPPORT_INTRO[0]}
      />

      <PageSection>
        <div className="flex flex-col items-center gap-10">
          <p className="max-w-3xl text-center font-public text-base leading-relaxed text-muted-foreground lg:text-lg">
            {SUPPORT_INTRO[1]}
          </p>
          <CtaLink href={inquiryHref("Sponsorship")}>Contact Malhaar</CtaLink>
        </div>
      </PageSection>

      <PageSection tone="tint">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <SectionHeading
            parts={[
              { text: "Get" },
              { text: "Involved", accent: true },
            ]}
          />
          <CtaLink href={inquiryHref("Sponsorship")}>Contact Malhaar</CtaLink>
        </div>
      </PageSection>
    </>
  );
}
