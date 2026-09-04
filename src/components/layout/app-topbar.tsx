"use client";

import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { allNavItems } from "@/components/layout/nav-config";
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

function labelForSegment(pathname: string) {
  const match = allNavItems.find((item) => item.href === pathname);
  if (match) return match.label;
  const segment = pathname.split("/").filter(Boolean).at(-1) ?? "";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function AppTopbar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean).slice(1); // drop leading "admin"

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-1 h-5" />
        <Breadcrumb>
          <BreadcrumbList>
            {segments.length === 0 ? (
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            ) : (
              segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                const path = `/admin/${segments.slice(0, index + 1).join("/")}`;
                const label = labelForSegment(path);

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

      <UserNav />
    </header>
  );
}
