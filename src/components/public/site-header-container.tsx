import { getPublicPortalIdentity } from "@/actions/portal-session";
import { getPublicSiteSettings, getSiteLogoUrl } from "@/actions/public-content";
import { SiteHeader } from "@/components/public/site-header";

interface SiteHeaderContainerProps {
  scrollContainerId?: string;
}

export async function SiteHeaderContainer({ scrollContainerId }: SiteHeaderContainerProps) {
  const [portalIdentity, settings, logoSrc] = await Promise.all([
    getPublicPortalIdentity(),
    getPublicSiteSettings(),
    getSiteLogoUrl(),
  ]);

  return (
    <SiteHeader
      scrollContainerId={scrollContainerId}
      portalIdentity={portalIdentity}
      settings={settings}
      logoSrc={logoSrc}
    />
  );
}
