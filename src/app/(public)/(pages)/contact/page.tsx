import { getPublicHeroThemes, getPublicSiteSettings } from "@/actions/public-content";
import { InquiryForm } from "@/components/public/inquiry-form";
import { JsonLd } from "@/components/public/json-ld";
import { PageHero } from "@/components/public/page-hero";
import { PageSection } from "@/components/public/page-section";
import { SITE_LOCATIONS } from "@/lib/public-site";
import { breadcrumbJsonLd, jsonLdGraph, pageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

// The canonical address is /contact, so links that preselect a subject (/contact?interest=…)
// are not treated as separate pages.
export const metadata: Metadata = pageMetadata({
  title: "Contact & Class Inquiries — Wood Dale & Elgin, IL",
  description:
    "Contact Malhaar Dance Company in Wood Dale and Elgin, Illinois, about classes, performance bookings, sponsorship, collaborations, the Ananta festival, or press.",
  path: "/contact",
});

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const [{ interest }, settings, heroThemes] = await Promise.all([searchParams, getPublicSiteSettings(), getPublicHeroThemes()]);

  return (
    <>
      <JsonLd data={jsonLdGraph(breadcrumbJsonLd([{ name: "Contact", path: "/contact" }]))} />
      <PageHero
        theme={heroThemes.contact}
        eyebrow="Contact Malhaar Dance Company"
        heading={[
          { text: "Get in" },
          { text: "Touch", accent: true },
        ]}
        lead="Interested in joining Malhaar, booking a performance, or supporting our work? Send us a message and we will reply by email."
      />

      <PageSection>
        <div className="grid gap-10 lg:grid-cols-5 lg:gap-16">
          <div className="flex flex-col gap-8 lg:col-span-2">
            <div className="flex flex-col gap-3">
              <h2 className="font-condensed text-sm tracking-widest text-primary uppercase">Locations</h2>
              <dl className="grid grid-cols-2 gap-6">
                {SITE_LOCATIONS.map((location) => (
                  <div key={location}>
                    <dt className="font-public text-xl font-light tracking-wide text-foreground uppercase">{location}</dt>
                    <dd className="font-public text-sm text-muted-foreground">Illinois</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="font-condensed text-sm tracking-widest text-primary uppercase">Email</h2>
              <a href={`mailto:${settings.email}`} className="font-display text-2xl text-primary italic hover:underline">
                {settings.email}
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="font-condensed text-sm tracking-widest text-primary uppercase">Phone & WhatsApp</h2>
              <a href={`tel:${settings.phone.replace(/[^\d]/g, "")}`} className="font-display text-2xl text-primary italic hover:underline">
                {settings.phone}
              </a>
              {settings.whatsappUrl && (
                <a href={settings.whatsappUrl} target="_blank" rel="noreferrer" className="font-public text-sm text-muted-foreground hover:text-primary hover:underline">
                  Message us on WhatsApp
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {settings.socialLinks.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="font-public text-sm text-muted-foreground hover:text-primary hover:underline">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="lg:col-span-3">
            <InquiryForm defaultInterest={typeof interest === "string" ? interest : undefined} contactEmail={settings.email} />
          </div>
        </div>
      </PageSection>
    </>
  );
}
