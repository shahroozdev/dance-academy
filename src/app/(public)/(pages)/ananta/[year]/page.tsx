import { notFound } from "next/navigation";

import { getPublicFestivals, getPublicHeroThemes, getPublicSiteSettings } from "@/actions/public-content";
import { FestivalView } from "@/components/public/festival-view";
import { JsonLd } from "@/components/public/json-ld";
import { breadcrumbJsonLd, festivalJsonLd, jsonLdGraph, pageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

// Only published editions have a page; a draft, an archived edition, or an unknown year is a 404.
const findEdition = async (year: string) => (await getPublicFestivals()).find((edition) => edition.year === year);

export async function generateMetadata({ params }: PageProps<"/ananta/[year]">): Promise<Metadata> {
  const edition = await findEdition((await params).year);
  if (!edition) return {};
  // The festival's own name already contains "Malhaar", so the site name is not appended.
  return pageMetadata({
    title: `Malhaar Ananta Arts Festival ${edition.year} — ${edition.venueTown}, Illinois`,
    absoluteTitle: true,
    description: `Malhaar Ananta Arts Festival ${edition.year}: ${edition.date}, ${edition.time}, ${edition.venue}. Featuring ${edition.artists.map((artist) => `${artist.name} (${artist.form})`).join(" and ")}.`,
    path: `/ananta/${edition.year}`,
  });
}

export default async function AnantaEditionPage({ params }: PageProps<"/ananta/[year]">) {
  const { year } = await params;
  const [festivals, settings, heroThemes] = await Promise.all([getPublicFestivals(), getPublicSiteSettings(), getPublicHeroThemes()]);
  const edition = festivals.find((festival) => festival.year === year);
  if (!edition) notFound();

  return (
    <>
      <JsonLd
        data={jsonLdGraph(
          breadcrumbJsonLd([{ name: `Ananta Festival ${edition.year}`, path: `/ananta/${edition.year}` }]),
          festivalJsonLd(edition),
        )}
      />
      <FestivalView edition={edition} years={festivals.map((festival) => festival.year)} contactEmail={settings.email} heroTheme={heroThemes.festival} />
    </>
  );
}
