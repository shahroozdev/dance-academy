"use client";

import { usePathname } from "next/navigation";
import { Fragment, type ReactNode } from "react";

import { allNavItems, type NavItem } from "@/components/layout/nav-config";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserNav } from "@/components/layout/user-nav";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

function labelForSegment(pathname: string, navItems: NavItem[]) {
  const match = navItems.find((item) => item.href === pathname);
  if (match) return match.label;
  const segment = pathname.split("/").filter(Boolean).at(-1) ?? "";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

const ADMIN_ACTIONS = (
  <>
    <NotificationBell />
    <UserNav />
  </>
);

type AppTopbarProps = {
  /** The portal's home address, e.g. "/admin". Breadcrumbs are built from the path below it. */
  homeHref?: string;
  homeLabel?: string;
  navItems?: NavItem[];
  /** What sits at the right end of the bar. */
  actions?: ReactNode;
};

/** The sticky top bar shared by Studio Admin (the defaults) and the Content Portal. */
export function AppTopbar({
  homeHref = "/admin",
  homeLabel = "Dashboard",
  navItems = allNavItems,
  actions = ADMIN_ACTIONS,
}: AppTopbarProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean).slice(1); // drop the portal's own segment

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-1 h-5" />
        <Breadcrumb>
          <BreadcrumbList>
            {segments.length === 0 ? (
              <BreadcrumbItem>
                <BreadcrumbPage>{homeLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            ) : (
              segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                const path = `${homeHref}/${segments.slice(0, index + 1).join("/")}`;
                const label = labelForSegment(path, navItems);

                return (
                  <Fragment key={path}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={path}>{label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                );
              })
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    </header>
  );
}
