"use client";

import { useState } from "react";
import { z } from "zod";

import { paymentCreateSchema, refundCreateSchema } from "@/actions/payments.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Modal } from "@/components/common/modal";
import { Skeleton } from "@/components/common/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

const METHOD_OPTIONS = [
  { label: "Zelle", value: "ZELLE" },
  { label: "Cash", value: "CASH" },
  { label: "Check", value: "CHECK" },
  { label: "Other", value: "OTHER" },
];

function todayValue(): string {
  return new Date().toISOString().split("T")[0];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

// billingId is supplied by this modal, not the user, so it's kept out of the client-validated
// form schema entirely rather than trusted to survive as an unregistered form field.
const paymentFormSchema = paymentCreateSchema.omit({ billingId: true });
const refundFormSchema = refundCreateSchema.omit({ billingId: true });
const paymentEntryFormSchema = paymentFormSchema.extend({ paymentKind: z.enum(["FULL", "PARTIAL"]) });
const refundEntryFormSchema = refundFormSchema.extend({ paymentKind: z.enum(["FULL", "PARTIAL"]) });
type PaymentFormInput = z.infer<typeof paymentEntryFormSchema>;

function formatMonth(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function PaymentModal({ billingId, onClose }: { billingId: string; onClose: () => void }) {
  const [selectedBillingId, setSelectedBillingId] = useState(billingId);
  const { data: billing, isLoading } = useQuery("getMonthlyBillingById", [selectedBillingId]);
  const { data: billOptions } = useQuery(
    "getStudentBillingPaymentOptions",
    [billing?.studentId ?? ""],
    { enabled: Boolean(billing?.studentId) },
  );
  const isRefund = (billing?.balance ?? 0) < 0;
  const title = isRefund ? "Record Refund" : "Record Payment";
  const {
    mutate,
    isLoading: isSaving,
    error,
  } = useMutate(isRefund ? "createRefund" : "createPayment", {
    invalidateKeys: ["getMonthlyBillings", "getMonthlyBillingById", "getPayments", "getFinancialSummary", "getMonthlyTrend", "getDashboardSummary"],
    onSuccess: onClose,
  });

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      className="max-w-sm"
      title={
        <div>
          {title}
          {billing && (
            <p className="text-sm font-normal text-muted-foreground">
              {billing.student.fullName} — {formatMonth(billing.month)} — {isRefund ? "credit available" : "balance due"} {formatCurrency(Math.abs(billing.balance))}
            </p>
          )}
        </div>
      }
    >
      {({ close }) => (
        <div className="space-y-4">
          {isLoading || !billing ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <FORM
              schema={isRefund ? refundEntryFormSchema : paymentEntryFormSchema}
              defaultValues={{
                paymentDate: todayValue(),
                amount: isRefund ? Math.min(-billing.balance, billing.amountPaid) : Math.max(0, billing.balance),
                method: "ZELLE",
                reference: "",
                notes: "",
                paymentKind: "FULL",
              }}
              onSubmit={async (data: PaymentFormInput) => {
                const { paymentKind, ...payment } = data;
                const amount = isRefund || paymentKind === "PARTIAL" ? payment.amount : Math.max(0, billing.balance);
                await mutate({
                  billingId: selectedBillingId,
                  ...payment,
                  amount,
                  notes: payment.notes ?? "",
                });
              }}
            >
              {(form) => (
                <div className="space-y-4">
                  {isRefund && <p className="text-sm text-muted-foreground">Record this only after returning the money. It reduces collected income on the refund date.</p>}
                  {!isRefund && (
                    <div className="space-y-2">
                      <Label htmlFor="payment-billing-month">Payment For Month</Label>
                      <Input
                      id="payment-billing-month"
                      type="select"
                      value={selectedBillingId}
                      onChange={setSelectedBillingId}
                      options={(billOptions ?? [])
                        .filter((option) => option.balance > 0 || option.id === selectedBillingId)
                        .map((option) => ({
                          value: option.id,
                          label: `${formatMonth(option.month)} — ${formatCurrency(option.balance)} due`,
                        }))}
                      />
                    </div>
                  )}
                  {!isRefund && (
                    <FormFeilds
                      name="paymentKind"
                      label="Payment Amount Type"
                      type="select"
                      options={[
                        { value: "FULL", label: `Full remaining balance (${formatCurrency(billing.balance)})` },
                        { value: "PARTIAL", label: "Partial payment" },
                      ]}
                    />
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormFeilds name="paymentDate" label={isRefund ? "Refund Date" : "Payment Date"} type="date" />
                    <FormFeilds name="amount" label="Amount ($)" type="number" disabled={!isRefund && form.watch("paymentKind") === "FULL"} />
                  </div>
                  <FormFeilds name="method" label="Method" type="select" options={METHOD_OPTIONS} />
                  <FormFeilds name="reference" label="Reference" placeholder="e.g. Zelle confirmation #" />
                  <FormFeilds name="notes" label={isRefund ? "Refund Reason" : "Notes"} type="textarea" />
                  {Boolean(error) && (
                    <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Could not save. Please try again."}</p>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={close}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving || !form.formState.isValid}>
                      {isSaving ? "Saving..." : title}
                    </Button>
                  </div>
                </div>
              )}
            </FORM>
          )}
        </div>
      )}
    </Modal>
  );
}
