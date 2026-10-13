"use client";

import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { AppBrand } from "@/components/layout/app-brand";
import { navGroups, type NavGroup } from "@/components/layout/nav-config";
import { Link } from "@/components/Link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const signOutOfAdmin = () => signOut({ callbackUrl: "/admin/login" });

type AppSidebarProps = {
  logoSrc?: string | null;
  /** The portal's home address; a link to it is only "current" on that exact page. */
  homeHref?: string;
  brandName?: string;
  groups?: NavGroup[];
  onSignOut?: () => void;
};

/** The collapsible sidebar shared by Studio Admin (the defaults) and the Content Portal. */
export function AppSidebar({
  logoSrc,
  homeHref = "/admin",
  brandName,
  groups = navGroups,
  onSignOut = signOutOfAdmin,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <AppBrand className="px-1 py-1" logoSrc={logoSrc} href={homeHref} name={brandName} />
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== homeHref && pathname.startsWith(`${item.href}/`));
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <Link href={item.href}>
                          <item.icon />
                          <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton variant="destructive" tooltip="Sign out" onClick={onSignOut}>
              <LogOut />
              <span className="truncate group-data-[collapsible=icon]:hidden">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
