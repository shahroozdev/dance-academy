import { SessionProvider } from "next-auth/react";

import { getStudioSettings } from "@/actions/settings";
import { auth } from "@/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { ThemeInjector } from "@/components/layout/theme-injector";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { contentAuth } from "@/content-auth";

const CONTENT_PORTAL_LINK = { href: "/content", label: "Content Portal" };

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, contentSession, settings] = await Promise.all([auth(), contentAuth(), getStudioSettings()]);
  const otherPortal = contentSession?.user?.portal === "content" ? CONTENT_PORTAL_LINK : undefined;

  return (
    <SessionProvider session={session}>
      <ThemeInjector initialSettings={settings} />
      <SidebarProvider>
        <AppSidebar logoSrc={settings.logoUrl} otherPortal={otherPortal} />
        <SidebarInset className="min-w-0">
          <AppTopbar />
          <div className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}
