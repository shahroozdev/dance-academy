"use client";

import {
  FilePenLine,
  History,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Newspaper,
  PartyPopper,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { signOutOfContentPortal } from "@/actions/content-session";
import { useContentUser } from "@/components/content/content-user-context";
import { InquiryBell } from "@/components/content/inquiry-bell";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import type { NavGroup } from "@/components/layout/nav-config";
import { UserMenu } from "@/components/layout/user-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";


const HOME_HREF = "/content";

// The last group is for Content Owners only; hiding it is a convenience — each of those pages
// and every action behind them checks the role again on the server.
const OWNER_GROUP_LABEL = "Manage";

const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", items: [{ label: "Overview", href: HOME_HREF, icon: LayoutDashboard }] },
  {
    label: "Website content",
    items: [
      { label: "Festivals", href: "/content/festivals", icon: PartyPopper },
      { label: "Performances", href: "/content/performances", icon: FilePenLine },
      { label: "Press & Media", href: "/content/press", icon: Newspaper },
      { label: "Public Profiles", href: "/content/profiles", icon: UserRound },
    ],
  },
  { label: "Files", items: [{ label: "Media Library", href: "/content/media", icon: ImageIcon }] },
  { label: "Messages", items: [{ label: "Inquiries", href: "/content/inquiries", icon: Inbox }] },
  {
    label: OWNER_GROUP_LABEL,
    items: [
      { label: "Website Settings", href: "/content/settings", icon: Settings },
      { label: "Users", href: "/content/users", icon: Users },
      { label: "History", href: "/content/history", icon: History },
    ],
  },
];

const ROLE_LABELS = { OWNER: "Content Owner", EDITOR: "Content Editor" };

const signOut = () => {
  void signOutOfContentPortal();
};

/**
 * The Content Portal's frame: the same sidebar and top bar as Studio Admin, with the portal's own
 * sections and its own sign-out (which clears only the content session).
 */
type ContentShellProps = { name: string; logoSrc?: string | null; children: ReactNode };

export function ContentShell({ name, logoSrc, children }: ContentShellProps) {
  const { role, isOwner } = useContentUser();
  const groups = useMemo(
    () => NAV_GROUPS.filter((group) => isOwner || group.label !== OWNER_GROUP_LABEL),
    [isOwner],
  );
  const navItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  return (
    <SidebarProvider>
      <AppSidebar logoSrc={logoSrc} homeHref={HOME_HREF} brandName="Malhaar Content" groups={groups} onSignOut={signOut} />
      <SidebarInset className="min-w-0">
        <AppTopbar
          homeHref={HOME_HREF}
          homeLabel="Overview"
          navItems={navItems}
          actions={
            <>
              <InquiryBell />
              <UserMenu name={name} roleLabel={ROLE_LABELS[role]} fallbackName="Content user" onSignOut={signOut} />
            </>
          }
        />
        <div className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
