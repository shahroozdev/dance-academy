import { getPublicSiteSettings, getSiteLogoUrl } from "@/actions/public-content";
import { SiteHeader } from "@/components/public/site-header";

interface SiteHeaderContainerProps {
  scrollContainerId?: string;
}

export async function SiteHeaderContainer({ scrollContainerId }: SiteHeaderContainerProps) {
  const [settings, logoSrc] = await Promise.all([getPublicSiteSettings(), getSiteLogoUrl()]);

  return (
    <SiteHeader
      scrollContainerId={scrollContainerId}
      settings={settings}
      logoSrc={logoSrc}
    />
  );
}
