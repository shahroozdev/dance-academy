import { SessionProvider } from "next-auth/react";

import { getStudioSettings } from "@/actions/settings";
import { auth } from "@/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { ThemeInjector } from "@/components/layout/theme-injector";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const settings = await getStudioSettings();

  return (
    <SessionProvider session={session}>
      <ThemeInjector settings={settings} />
      <SidebarProvider>
        <AppSidebar logoSrc={settings.logoUrl} />
        <SidebarInset>
          <AppTopbar />
          <div className="flex-1 p-4 sm:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}
