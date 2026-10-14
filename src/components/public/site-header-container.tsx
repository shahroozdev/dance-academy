import { getPublicPortalIdentities } from "@/actions/portal-session";
import { getPublicSiteSettings, getSiteLogoUrl } from "@/actions/public-content";
import { SiteHeader } from "@/components/public/site-header";

interface SiteHeaderContainerProps {
  scrollContainerId?: string;
}

export async function SiteHeaderContainer({ scrollContainerId }: SiteHeaderContainerProps) {
  const [portalIdentities, settings, logoSrc] = await Promise.all([
    getPublicPortalIdentities(),
    getPublicSiteSettings(),
    getSiteLogoUrl(),
  ]);

  return (
    <SiteHeader
      scrollContainerId={scrollContainerId}
      portalIdentities={portalIdentities}
      settings={settings}
      logoSrc={logoSrc}
    />
  );
}
