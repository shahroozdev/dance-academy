"use client";

import { Bell, UserPlus, Send, MailWarning } from "lucide-react";
import { useEffect } from "react";

import { Link } from "@/components/Link";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@/hooks/useQuery";

// No push/websocket channel exists for this, so the badge stays reasonably fresh via polling
// rather than being purely mount-time — a registration submitted on the public form, or a bill
// generated elsewhere, should show up without a full page reload.
const POLL_INTERVAL_MS = 60_000;

export function NotificationBell() {
  const { data, refetch } = useQuery("getAdminNotificationSummary", []);

  useEffect(() => {
    const id = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refetch]);

  const total = data?.total ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted focus:outline-hidden">
        <Bell className="size-4 text-muted-foreground" />
        {total > 0 && (
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full border-2 border-background bg-destructive px-1 text-[10px] leading-none text-white">
            {total > 99 ? "99+" : total}
          </Badge>
        )}
        <span className="sr-only">{total > 0 ? `${total} items need attention` : "No items need attention"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Needs Attention</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!data || total === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
        ) : (
          <>
            {data.pendingRegistrations > 0 && (
              <DropdownMenuItem asChild>
                <Link href="/admin/registrations" className="flex items-center gap-2">
                  <UserPlus className="size-4" />
                  <span className="flex-1">Pending registration requests</span>
                  <Badge variant="secondary">{data.pendingRegistrations}</Badge>
                </Link>
              </DropdownMenuItem>
            )}
            {data.pendingFamilyNotifications > 0 && (
              <DropdownMenuItem asChild>
                <Link href="/admin/notifications" className="flex items-center gap-2">
                  <Send className="size-4" />
                  <span className="flex-1">Bills awaiting notification</span>
                  <Badge variant="secondary">{data.pendingFamilyNotifications}</Badge>
                </Link>
              </DropdownMenuItem>
            )}
            {data.failedNotifications > 0 && (
              <DropdownMenuItem asChild>
                <Link href="/admin/notifications" className="flex items-center gap-2">
                  <MailWarning className="size-4" />
                  <span className="flex-1">Failed sends (last 30 days)</span>
                  <Badge variant="destructive">{data.failedNotifications}</Badge>
                </Link>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
