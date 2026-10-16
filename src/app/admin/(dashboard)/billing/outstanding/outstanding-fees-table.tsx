"use client";

import { HandCoins } from "lucide-react";

import { Skeleton } from "@/components/common/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { Link } from "@/components/Link";
import { useQuery } from "@/hooks/useQuery";
import { useTableColumns } from "@/hooks/useTableColumns";
import type { OutstandingBill, OutstandingFees } from "@/types/billing";

import type { ReactNode } from "react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatMonth(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

const CELLS: Record<string, (bill: OutstandingBill) => ReactNode> = {
  student: (bill) => <Link href={`/admin/billing/${bill.billingId}`} className="font-medium hover:underline">{bill.studentName}</Link>,
  family: (bill) => bill.familyName,
  month: (bill) => formatMonth(bill.month),
  classes: (bill) => bill.pendingClasses.map((fee) => `${fee.className} ${formatCurrency(fee.pending)}`).join(", "),
  paid: (bill) => formatCurrency(bill.amountPaid),
  balance: (bill) => <span className="font-medium">{formatCurrency(bill.balance)}</span>,
};

export function OutstandingFeesTable({
  query,
  initialData,
}: {
  query: { classId?: string; page: number; pageSize: number };
  initialData: OutstandingFees;
}) {
  const columns = useTableColumns("outstandingFees");
  const { data } = useQuery("getOutstandingFees", [query], { initialData });

  if (!data) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
      </div>
    );
  }
  if (data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <HandCoins className="size-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Nothing is outstanding for this selection.</p>
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => <TableHead key={column.key} className={column.className}>{column.label}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.data.map((bill) => (
          <TableRow key={bill.billingId}>
            {columns.map((column) => (
              <TableCell key={column.key} className={column.key === "classes" ? "whitespace-normal" : column.className}>
                {CELLS[column.key](bill)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
