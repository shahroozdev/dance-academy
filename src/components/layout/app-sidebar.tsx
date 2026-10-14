"use client";

import { ArrowLeftRight, LogOut } from "lucide-react";
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
  /** A shortcut to the other portal, passed only while this browser is signed in to it too. */
  otherPortal?: { href: string; label: string };
};

/** The collapsible sidebar shared by Studio Admin (the defaults) and the Content Portal. */
export function AppSidebar({
  logoSrc,
  homeHref = "/admin",
  brandName,
  groups = navGroups,
  onSignOut = signOutOfAdmin,
  otherPortal,
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
          {otherPortal && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={`Go to ${otherPortal.label}`}>
                <Link href={otherPortal.href}>
                  <ArrowLeftRight />
                  <span className="truncate group-data-[collapsible=icon]:hidden">Go to {otherPortal.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
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
