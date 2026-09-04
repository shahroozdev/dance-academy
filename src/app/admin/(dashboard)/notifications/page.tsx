"use client";

import { BellRing, MessageCircle } from "lucide-react";
import { Fragment, useState } from "react";

import { NotificationModal } from "@/app/admin/(dashboard)/billing/notification-modal";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/useQuery";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function NotificationsPage() {
  const [month, setMonth] = useState(currentMonthValue());
  const [notifyingFamilyId, setNotifyingFamilyId] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data: pending, isLoading: isLoadingPending } = useQuery("getPendingNotifications", [month]);
  const { data: logs, isLoading: isLoadingLogs } = useQuery("getNotificationLogs", [{ pageSize: 100 }]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        subtitle="Personalized parent fee messages, generated from billing — copy or open in WhatsApp to send."
      />

      <Card
        header={
          <div className="flex flex-wrap items-center gap-2">
            <MessageCircle className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">Pending for</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="flex h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        }
        headerClassName="border-b"
        contentClassName="p-0"
      >
        {isLoadingPending ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !pending?.length ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No pending notifications for this month — either no bills exist yet, or everyone&apos;s been notified.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Family</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Total Due</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((p) => (
                <TableRow key={p.familyId}>
                  <TableCell className="font-medium">{p.familyName}</TableCell>
                  <TableCell>{p.studentCount}</TableCell>
                  <TableCell>{formatCurrency(p.total)}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => setNotifyingFamilyId(p.familyId)}>
                      Send
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card
        header={
          <div className="flex items-center gap-2">
            <BellRing className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">Notification Log</span>
          </div>
        }
        headerClassName="border-b"
        contentClassName="p-0"
      >
        {isLoadingLogs ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !logs?.data.length ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No notifications sent yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Family</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.data.map((log) => (
                <Fragment key={log.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => setExpandedLogId((id) => (id === log.id ? null : log.id))}
                  >
                    <TableCell className="font-medium">{log.familyName}</TableCell>
                    <TableCell>
                      {new Date(log.month).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </TableCell>
                    <TableCell>{log.channel}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === "FAILED" ? "destructive" : "default"}>{log.status}</Badge>
                    </TableCell>
                    <TableCell>{log.sentAt ? new Date(log.sentAt).toLocaleString() : "—"}</TableCell>
                    <TableCell />
                  </TableRow>
                  {expandedLogId === log.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <pre className="whitespace-pre-wrap text-xs">{log.messageContent}</pre>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {notifyingFamilyId && (
        <NotificationModal familyId={notifyingFamilyId} month={month} onClose={() => setNotifyingFamilyId(null)} />
      )}
    </div>
  );
}
