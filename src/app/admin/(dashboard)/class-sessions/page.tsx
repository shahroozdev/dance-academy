"use client";

import { CalendarCheck2 } from "lucide-react";
import { useState } from "react";

import { SessionReportModal } from "@/app/admin/(dashboard)/class-sessions/session-report-modal";
import { Badge } from "@/components/common/badge";
import { Card } from "@/components/common/card";
import { Input } from "@/components/common/input";
import { Skeleton } from "@/components/common/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { PageHeader } from "@/components/shared/page-header";
import { useQuery } from "@/hooks/useQuery";

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return "Not generated";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function ClassSessionsPage() {
  const [month, setMonth] = useState(currentMonthValue());
  const { data: rows, isLoading } = useQuery("getMonthlyClassSessionTracking", [month]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Monthly Class Counts"
        subtitle="Teachers can record how many classes were actually held. Counts remain drafts until staff applies them to billing."
        actions={<Input type="month" value={month} onChange={setMonth} className="w-48" />}
      />
      <Card
        header={
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">Active Classes for the Selected Month</span>
          </div>
        }
        headerClassName="border-b"
        contentClassName="p-0"
      >
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Extra Rehearsals</TableHead>
                <TableHead>Regular Classes Reported</TableHead>
                <TableHead>Total Held</TableHead>
                <TableHead>Applied to Billing</TableHead>
                <TableHead>Expected Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead resizable={false} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows ?? []).map((row) => {
                const pending = row.reportedSessions !== null && row.reportedSessions !== row.appliedSessions;
                return (
                  <TableRow key={row.classId}>
                    <TableCell>
                      <p className="font-medium">{row.className}</p>
                      <p className="text-sm text-muted-foreground">{row.programName}</p>
                    </TableCell>
                    <TableCell>{row.teacherName ?? "—"}</TableCell>
                    <TableCell>{row.scheduledSessions}</TableCell>
                    <TableCell>{row.additionalSessions}</TableCell>
                    <TableCell>{row.reportedSessions ?? "Not reported"}</TableCell>
                    <TableCell>
                      {row.reportedSessions === null ? "Not reported" : row.reportedSessions + row.additionalSessions}
                    </TableCell>
                    <TableCell>{row.appliedSessions ?? "Not generated"}</TableCell>
                    <TableCell>{formatCurrency(row.monthlyClassFee)}</TableCell>
                    <TableCell>
                      {pending ? <Badge variant="secondary">Awaiting billing review</Badge> : <Badge variant="outline">Up to date</Badge>}
                    </TableCell>
                    <TableCell>
                      <SessionReportModal
                        classId={row.classId}
                        className={row.className}
                        month={month}
                        scheduledSessions={row.scheduledSessions}
                        additionalSessions={row.additionalSessions}
                        reportedSessions={row.reportedSessions}
                        reportNotes={row.reportNotes}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {!isLoading && (rows?.length ?? 0) === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No classes were active during this month.</div>
        )}
      </Card>
    </div>
  );
}
