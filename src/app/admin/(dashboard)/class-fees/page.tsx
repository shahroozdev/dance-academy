"use client";

import { DollarSign } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import TooltipWrapper from "@/components/common/TooltipWrapper";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

import { ClassFeeEditModal } from "./class-fee-edit-modal";

function formatCurrency(amount: number | null) {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function ClassFeesPage() {
  const [month, setMonth] = useState(currentMonthValue());
  const [classId, setClassId] = useState<string>("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: classesData } = useQuery("getClasses", [{ pageSize: 100, sortBy: "name" }]);
  const { data, isLoading } = useQuery("getClassMonthlyFees", [
    { month, classId: classId === "ALL" ? undefined : classId, page, pageSize },
  ]);
  // Unpaginated, whole-month fetch used only to decide whether "Finalize All" is still needed —
  // the paginated `data` above only reflects the current page/class filter.
  const { data: monthFeesForFinalizeCheck } = useQuery("getClassMonthlyFees", [{ month, pageSize: 10000 }]);
  const { mutate: finalizeFee, isLoading: isFinalizingOne } = useMutate("finalizeClassMonthlyFee", {
    invalidateKeys: ["getClassMonthlyFees"],
  });
  const { mutate: unfinalizeFee, isLoading: isUnfinalizingOne } = useMutate("unfinalizeClassMonthlyFee", {
    invalidateKeys: ["getClassMonthlyFees"],
  });
  const { mutate: finalizeAll, isLoading: isFinalizingAll } = useMutate("finalizeAllClassMonthlyFeesForMonth", {
    invalidateKeys: ["getClassMonthlyFees"],
  });

  const classOptions = useMemo(() => classesData?.data.map((c) => ({ label: c.name, value: c.id })) ?? [], [classesData]);

  const rows = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Class Monthly Fees"
        subtitle="Fees are created automatically when bills are generated. Override a specific month here for cancellations or seasonal pricing."
      />
      <Card
        header={
          <div className="flex items-center gap-2">
            <DollarSign className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">Fee Rows</span>
          </div>
        }
        headerClassName="border-b"
        contentClassName="flex min-h-0 flex-1 flex-col p-2"
      >
        <div className="flex flex-wrap items-center gap-2 p-2">
          <input
            type="month"
            value={month}
            onChange={(e) => { setMonth(e.target.value); setPage(1); }}
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Select value={classId} onValueChange={(value) => { setClassId(value); setPage(1); }}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All classes</SelectItem>
              {classOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TooltipWrapper label="Finalize all class fees for this month">
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              disabled={isFinalizingAll || !monthFeesForFinalizeCheck || monthFeesForFinalizeCheck.data.every((f) => f.isFinalized)}
              onClick={() => finalizeAll(month)}
            >
              {isFinalizingAll ? "Finalizing..." : `Finalize All for ${month}`}
            </Button>
          </TooltipWrapper>
        </div>

        {isLoading && (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {!isLoading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <DollarSign className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No fee rows for this month yet — they&apos;re created the first time bills are
              generated for it on the Billing page.
            </p>
          </div>
        )}
        {!isLoading && rows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Billable Sessions</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Flat Fee</TableHead>
                <TableHead>Monthly Class Fee</TableHead>
                <TableHead>Overridden</TableHead>
                <TableHead>Finalized</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className="font-medium">{fee.class.name}</TableCell>
                  <TableCell>{fee.billableSessions ?? "—"}</TableCell>
                  <TableCell>{formatCurrency(fee.rate)}</TableCell>
                  <TableCell>{formatCurrency(fee.flatFee)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(fee.monthlyClassFee)}</TableCell>
                  <TableCell>
                    {fee.isOverridden && <Badge variant="secondary">Overridden</Badge>}
                  </TableCell>
                  <TableCell>
                    {fee.isFinalized ? <Badge>Finalized</Badge> : <Badge variant="outline">Not finalized</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <TooltipWrapper label="Edit class fee">
                        <Button size="sm" variant="outline" onClick={() => setEditingId(fee.id)}>
                          Edit
                        </Button>
                      </TooltipWrapper>
                      {fee.isFinalized ? (
                        <TooltipWrapper label="Un-finalize class fee">
                          <Button size="sm" variant="outline" disabled={isUnfinalizingOne} onClick={() => unfinalizeFee(fee.id)}>
                            Un-finalize
                          </Button>
                        </TooltipWrapper>
                      ) : (
                        <TooltipWrapper label="Finalize class fee">
                          <Button size="sm" disabled={isFinalizingOne} onClick={() => finalizeFee(fee.id)}>
                            Finalize
                          </Button>
                        </TooltipWrapper>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            pages={data.pages}
            itemLabel="fee rows"
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        )}
      </Card>

      {editingId && <ClassFeeEditModal id={editingId} onClose={() => setEditingId(null)} />}
    </div>
  );
}
