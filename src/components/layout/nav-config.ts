import {
  BellRing,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Receipt,
  ReceiptText,
  Settings,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "People",
    items: [
      { label: "Families", href: "/admin/families", icon: Users },
      { label: "Students", href: "/admin/students", icon: GraduationCap },
    ],
  },
  {
    label: "Programs",
    items: [
      { label: "Classes", href: "/admin/classes", icon: CalendarDays },
      { label: "Enrollments", href: "/admin/enrollments", icon: ListChecks },
      { label: "Registration Requests", href: "/admin/registrations", icon: ClipboardList },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Billing", href: "/admin/billing", icon: Receipt },
      { label: "Payments", href: "/admin/payments", icon: Wallet },
      { label: "Expenses", href: "/admin/expenses", icon: ReceiptText },
      { label: "Other Income", href: "/admin/income", icon: TrendingUp },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Notifications", href: "/admin/notifications", icon: BellRing },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export const allNavItems: NavItem[] = navGroups.flatMap((group) => group.items);
