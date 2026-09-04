"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { AdjustmentModal } from "@/app/admin/(dashboard)/billing/adjustment-modal";
import { PaymentModal } from "@/app/admin/(dashboard)/billing/payment-modal";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  UNPAID: "destructive",
  PARTIAL: "secondary",
  PAID: "default",
  OVERPAID: "outline",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatMonth(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default function BillingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const { data: billing, isLoading } = useQuery("getMonthlyBillingById", [id]);
  const {
    mutate: recalculate,
    isLoading: isRecalculating,
    error: recalculateError,
  } = useMutate("recalculateBilling", {
    invalidateKeys: ["getMonthlyBillings", "getMonthlyBillingById"],
  });

  if (isLoading || !billing) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasPayments = billing.payments.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={billing.student.fullName}
        subtitle={`${formatMonth(billing.month)} — ${billing.student.family.familyName} family`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/students/${billing.studentId}`}>View Student</Link>
            </Button>
            <Button variant="outline" onClick={() => setIsAdjusting(true)}>
              Adjust
            </Button>
            {billing.status !== "PAID" && <Button onClick={() => setIsPaying(true)}>Record Payment</Button>}
            <Button
              variant="outline"
              disabled={hasPayments || isRecalculating}
              title={hasPayments ? "This bill has payments recorded and can no longer be recalculated." : undefined}
              onClick={() => recalculate(id)}
            >
              {isRecalculating ? "Recalculating..." : "Recalculate"}
            </Button>
          </div>
        }
      />

      {Boolean(recalculateError) && (
        <p className="text-sm text-destructive">Could not recalculate this bill. Please try again.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          header={<span className="text-sm font-medium">Class Fees Used In This Bill</span>}
          headerClassName="border-b"
          contentClassName="p-0"
        >
          {billing.lineItems.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No active enrollments this month.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Discount Eligible</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billing.lineItems.map((li) => (
                  <TableRow key={li.id}>
                    <TableCell className="font-medium">{li.enrollment.class.name}</TableCell>
                    <TableCell>{li.enrollment.class.discountEligible ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(li.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card header={<span className="text-sm font-medium">Calculation</span>} headerClassName="border-b">
          <div className="space-y-2 p-4 text-sm">
            <Row label="Base Tuition" value={formatCurrency(billing.baseTuition)} />
            <Row
              label="Multi-Class Discount"
              value={billing.multiClassDiscount > 0 ? `-${formatCurrency(billing.multiClassDiscount)}` : "—"}
            />
            <Row
              label="Sibling Discount"
              value={billing.siblingDiscount > 0 ? `-${formatCurrency(billing.siblingDiscount)}` : "—"}
            />
            <Row label="Adjustment" value={billing.adjustment !== 0 ? formatCurrency(billing.adjustment) : "—"} />
            {billing.adjustmentNotes && <p className="text-xs text-muted-foreground">{billing.adjustmentNotes}</p>}
            <div className="border-t pt-2">
              <Row label="Final Amount Due" value={formatCurrency(billing.finalAmountDue)} emphasized />
            </div>
            <div className="border-t pt-2">
              <Row label="Amount Paid" value={formatCurrency(billing.amountPaid)} />
              <Row label="Balance" value={formatCurrency(billing.balance)} />
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={STATUS_BADGE_VARIANT[billing.status] ?? "outline"}>{billing.status}</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card header={<span className="text-sm font-medium">Payments</span>} headerClassName="border-b" contentClassName="p-0">
        {billing.payments.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No payments recorded yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billing.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                  <TableCell>{formatCurrency(p.amount)}</TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell>{p.reference ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {isAdjusting && <AdjustmentModal billingId={id} onClose={() => setIsAdjusting(false)} />}
      {isPaying && <PaymentModal billingId={id} onClose={() => setIsPaying(false)} />}
    </div>
  );
}

function Row({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={emphasized ? "text-lg font-semibold" : undefined}>{value}</span>
    </div>
  );
}
