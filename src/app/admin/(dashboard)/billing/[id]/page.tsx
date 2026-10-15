"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AdjustmentModal } from "@/app/admin/(dashboard)/billing/adjustment-modal";
import { PaymentModal } from "@/app/admin/(dashboard)/billing/payment-modal";
import { Alert, AlertDescription, AlertTitle } from "@/components/common/alert";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Skeleton } from "@/components/common/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import TooltipWrapper from "@/components/common/TooltipWrapper";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
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
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const { data: billing, isLoading } = useQuery("getMonthlyBillingById", [id]);
  const {
    mutate: recalculate,
    isLoading: isRecalculating,
    error: recalculateError,
  } = useMutate("recalculateBilling", {
    invalidateKeys: ["getMonthlyBillings", "getMonthlyBillingById"],
  });
  const { mutate: markReviewed, isLoading: isMarkingReviewed } = useMutate("resolveBillingManualReview", {
    invalidateKeys: ["getMonthlyBillings", "getMonthlyBillingById", "getAdminNotificationSummary"],
  });

  if (isLoading || !billing) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const paidByClass = new Map<string, number>();
  for (const payment of billing.payments) {
    if (payment.classId) {
      paidByClass.set(payment.classId, (paidByClass.get(payment.classId) ?? 0) + payment.amount);
    }
  }
  const editingPayment = billing.payments.find((payment) => payment.id === editingPaymentId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={billing.student.fullName}
        subtitle={`${formatMonth(billing.month)} — ${billing.student.family.familyName} family`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/students/${billing.studentId}`}>View Student</Link>
            </Button>
            <TooltipWrapper label="Adjust billing">
              <Button variant="outline" onClick={() => setIsAdjusting(true)}>
                Adjust
              </Button>
            </TooltipWrapper>
            {billing.status !== "PAID" && (
              <TooltipWrapper
                label={
                  billing.status === "OVERPAID"
                    ? "Record Refund"
                    : "Record Payment"
                }
              >
                <Button onClick={() => setIsPaying(true)}>
                  {billing.status === "OVERPAID"
                    ? "Record Refund"
                    : "Record Payment"}
                </Button>
              </TooltipWrapper>
            )}
            <TooltipWrapper
              label={
                billing.payments.length > 0
                  ? "Recalculate fees while preserving recorded payments"
                  : "Recalculate billing"
              }
            >
              <Button
                variant="outline"
                disabled={isRecalculating}
                onClick={() => recalculate(id)}
              >
                {isRecalculating ? "Recalculating..." : "Recalculate"}
              </Button>
            </TooltipWrapper>
          </div>
        }
      />

      {Boolean(recalculateError) && (
        <p className="text-sm text-destructive">Could not recalculate this bill. Please try again.</p>
      )}

      {billing.needsManualReview && (
        <Alert variant="destructive">
          <AlertTitle>Manual billing review required</AlertTitle>
          <AlertDescription>
            <p>{billing.manualReviewReason} Review the class fees and payment history, then use <strong>Adjust</strong> if the balance must change.</p>
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              disabled={isMarkingReviewed}
              onClick={() => markReviewed(id)}
            >
              {isMarkingReviewed ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
              {isMarkingReviewed ? "Saving..." : "Mark as Reviewed — No Adjustment Needed"}
            </Button>
          </AlertDescription>
        </Alert>
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
                  <TableHead className="text-right">Paid for Class</TableHead>
                  <TableHead className="text-right">Class Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billing.lineItems.map((li) => {
                  const classPaid = paidByClass.get(li.enrollment.class.id) ?? 0;
                  return (
                    <TableRow key={li.id}>
                      <TableCell className="font-medium">{li.enrollment.class.name}</TableCell>
                      <TableCell>{li.enrollment.class.discountEligible ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(li.amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(classPaid)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(li.amount - classPaid)}</TableCell>
                    </TableRow>
                  );
                })}
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
                <TableHead>Class</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead resizable={false}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billing.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.paymentDate).toLocaleDateString("en-US", { timeZone: "UTC" })}</TableCell>
                  <TableCell>{formatCurrency(p.amount)}</TableCell>
                  <TableCell>{p.class?.name ?? "General / multiple classes"}</TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell>{p.reference ?? "—"}</TableCell>
                  <TableCell className="max-w-md whitespace-normal">{p.notes ?? "—"}</TableCell>
                  <TableCell>
                    {p.amount > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setEditingPaymentId(p.id)}>
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {isAdjusting && <AdjustmentModal billingId={id} onClose={() => setIsAdjusting(false)} />}
      {isPaying && <PaymentModal billingId={id} onClose={() => setIsPaying(false)} />}
      {editingPayment && (
        <PaymentModal
          billingId={id}
          payment={editingPayment}
          onClose={() => setEditingPaymentId(null)}
        />
      )}
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
