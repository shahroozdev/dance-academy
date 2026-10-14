import { requireContentUser } from "@/actions/content-access";
import { getSiteLogoUrl } from "@/actions/public-content";
import { auth } from "@/auth";
import { ContentShell } from "@/components/content/content-shell";
import { ContentUserProvider } from "@/components/content/content-user-context";

export default async function ContentDashboardLayout({ children }: { children: React.ReactNode }) {
  const [contentUser, logoSrc, adminSession] = await Promise.all([requireContentUser(), getSiteLogoUrl(), auth()]);

  return (
    <ContentUserProvider role={contentUser.role}>
      <ContentShell name={contentUser.name} logoSrc={logoSrc} hasAdminSession={adminSession?.user?.portal === "admin"}>{children}</ContentShell>
    </ContentUserProvider>
  );
}
