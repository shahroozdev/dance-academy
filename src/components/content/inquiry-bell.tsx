"use client";

import { Bell } from "lucide-react";
import { useEffect } from "react";

import { Badge } from "@/components/common/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/dropdown-menu";
import { Link } from "@/components/Link";
import { useQuery } from "@/hooks/useQuery";

// There is no push channel, so the count is refreshed on a timer: an inquiry sent from the
// website shows up within a minute without reloading the page.
const POLL_INTERVAL_MS = 60_000;

const formatWhen = (value: Date) =>
  new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const bellLabel = (newCount: number) =>
  ({ 0: "No new inquiries", 1: "1 new inquiry" })[newCount] ?? `${newCount} new inquiries`;

/** The bell in the Content Portal's header: how many website inquiries are new, and the latest few. */
export function InquiryBell() {
  const { data, refetch } = useQuery("getContentInquirySummary", []);

  useEffect(() => {
    const id = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refetch]);

  const newCount = data?.newCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted focus:outline-hidden">
        <Bell className="size-4 text-muted-foreground" />
        {newCount > 0 && (
          <Badge aria-hidden="true" className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full border-2 border-background bg-destructive px-1 text-[10px] leading-none text-white">
            {newCount > 99 ? "99+" : newCount}
          </Badge>
        )}
        <span className="sr-only">{bellLabel(newCount)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>New inquiries</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!data || newCount === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">No new inquiries.</div>
        ) : (
          data.latest.map((inquiry) => (
            <DropdownMenuItem key={inquiry.id} asChild>
              <Link href="/content/inquiries" className="flex flex-col items-start gap-0.5">
                <span className="max-w-full truncate text-sm font-medium text-foreground">{inquiry.name}</span>
                <span className="max-w-full truncate text-xs text-muted-foreground">
                  {inquiry.interestedIn} · {formatWhen(inquiry.createdAt)}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/content/inquiries" className="justify-center text-sm font-medium text-primary">
            {newCount > 5 ? `See all ${newCount} new inquiries` : "Open Inquiries"}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
