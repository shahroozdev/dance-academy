import { requireContentUser } from "@/actions/content-access";
import { getSiteLogoUrl } from "@/actions/public-content";
import { ContentShell } from "@/components/content/content-shell";
import { ContentUserProvider } from "@/components/content/content-user-context";

export default async function ContentDashboardLayout({ children }: { children: React.ReactNode }) {
  const [contentUser, logoSrc] = await Promise.all([requireContentUser(), getSiteLogoUrl()]);

  return (
    <ContentUserProvider role={contentUser.role}>
      <ContentShell name={contentUser.name} logoSrc={logoSrc}>{children}</ContentShell>
    </ContentUserProvider>
  );
}
