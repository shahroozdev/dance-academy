import { getContentFestivalById } from "@/actions/content-festivals";
import { getPublicFestivals, getPublicHeroThemes, getPublicSiteSettings } from "@/actions/public-content";
import { PreviewFrame } from "@/components/content/preview-frame";
import { FestivalView } from "@/components/public/festival-view";
import { toPublicFestival } from "@/lib/content-mappers";

// A draft edition as its public page would look. The action checks the content session, so this
// page is never reachable without one.
export default async function FestivalPreviewPage({ params }: PageProps<"/content/festivals/[id]/preview">) {
  const { id } = await params;
  const [festival, published, settings, heroThemes] = await Promise.all([
    getContentFestivalById(id),
    getPublicFestivals(),
    getPublicSiteSettings(),
    getPublicHeroThemes(),
  ]);
  const edition = toPublicFestival(festival);
  const years = [...new Set([edition.year, ...published.map((item) => item.year)])].sort().reverse();

  return (
    <PreviewFrame status={festival.status} backHref={`/content/festivals/${id}`}>
      <FestivalView edition={edition} years={years} contactEmail={settings.email} heroTheme={heroThemes.festival} />
    </PreviewFrame>
  );
}
