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

type EditablePayment = {
  id: string;
  paymentDate: Date | string;
  amount: number;
  method: "ZELLE" | "CASH" | "CHECK" | "OTHER";
  classId: string | null;
  reference: string | null;
  notes: string | null;
};

export function PaymentModal({ billingId, onClose, payment: existingPayment }: { billingId: string; onClose: () => void; payment?: EditablePayment }) {
  const [selectedBillingId, setSelectedBillingId] = useState(billingId);
  const { data: billing, isLoading } = useQuery("getMonthlyBillingById", [selectedBillingId]);
  const { data: billOptions } = useQuery(
    "getStudentBillingPaymentOptions",
    [billing?.studentId ?? ""],
    { enabled: Boolean(billing?.studentId) },
  );
  const isRefund = !existingPayment && (billing?.balance ?? 0) < 0;
  const title = isRefund ? "Record Refund" : "Record Payment";
  const {
    mutate,
    isLoading: isSaving,
    error,
  } = useMutate(isRefund ? "createRefund" : "createPayment", {
    invalidateKeys: ["getMonthlyBillings", "getMonthlyBillingById", "getPayments", "getFinancialSummary", "getMonthlyTrend", "getDashboardSummary"],
    onSuccess: onClose,
  });
  const { mutate: updateExisting, isLoading: isUpdating, error: updateError } = useMutate("updatePayment", {
    invalidateKeys: ["getMonthlyBillings", "getMonthlyBillingById", "getPayments", "getFinancialSummary", "getMonthlyTrend", "getDashboardSummary"],
    onSuccess: onClose,
  });
  const isEditing = Boolean(existingPayment);
  const saveError = error || updateError;
  const saveErrorMessage = saveError instanceof Error ? saveError.message : "Could not save. Please try again.";
  const readySubmitLabel = { editing: "Save Payment", creating: title }[isEditing ? "editing" : "creating"];
  const submitLabel = isSaving || isUpdating ? "Saving..." : readySubmitLabel;

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      className="max-w-sm"
      title={
        <div>
          {isEditing ? "Edit Payment" : title}
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
                paymentDate: existingPayment ? new Date(existingPayment.paymentDate).toISOString().slice(0, 10) : todayValue(),
                amount: existingPayment?.amount ?? (isRefund ? Math.min(-billing.balance, billing.amountPaid) : Math.max(0, billing.balance)),
                method: existingPayment?.method ?? "ZELLE",
                classId: existingPayment?.classId ?? "",
                reference: existingPayment?.reference ?? "",
                notes: existingPayment?.notes ?? "",
                paymentKind: existingPayment ? "PARTIAL" : "FULL",
              }}
              onSubmit={async (data: PaymentFormInput) => {
                const { paymentKind, ...payment } = data;
                const amount = isRefund || paymentKind === "PARTIAL" ? payment.amount : Math.max(0, billing.balance);
                const normalized = { ...payment, amount, notes: payment.notes ?? "" };
                if (isEditing) await updateExisting(existingPayment!.id, normalized);
                else await mutate({ billingId: selectedBillingId, ...normalized });
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
                      name="classId"
                      label="Payment For Class"
                      type="select"
                      options={[
                        { value: "", label: "General payment / multiple classes" },
                        ...billing.lineItems.map((lineItem) => ({
                          value: lineItem.enrollment.class.id,
                          label: lineItem.enrollment.class.name,
                        })),
                      ]}
                    />
                  )}
                  {!isRefund && (
                    <FormFeilds
                      name="paymentKind"
                      label="Payment Amount Type"
                      type="select"
                      options={[
                        { value: "FULL", label: `Full remaining balance (${formatCurrency(billing.balance)})` },
                        { value: "PARTIAL", label: "Custom amount (partial or overpayment)" },
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
                  {Boolean(saveError) && (
                    <p className="text-sm text-destructive">{saveErrorMessage}</p>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={close}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving || isUpdating || !form.formState.isValid}>
                      {submitLabel}
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
