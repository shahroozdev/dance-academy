"use client";

import { paymentCreateSchema, refundCreateSchema } from "@/actions/payments.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { Skeleton } from "@/components/common/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

import type { z } from "zod";

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
type PaymentFormInput = z.infer<typeof paymentFormSchema>;

export function PaymentModal({ billingId, onClose }: { billingId: string; onClose: () => void }) {
  const { data: billing, isLoading } = useQuery("getMonthlyBillingById", [billingId]);
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
    <Modal open onOpenChange={(open) => !open && onClose()} className="max-w-sm">
      {({ close }) => (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">{title}</h3>
            {billing && (
              <p className="text-sm text-muted-foreground">
                {billing.student.fullName} — {isRefund ? "credit available" : "balance due"} {formatCurrency(Math.abs(billing.balance))}
              </p>
            )}
          </div>

          {isLoading || !billing ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <FORM
              schema={isRefund ? refundFormSchema : paymentFormSchema}
              defaultValues={{
                paymentDate: todayValue(),
                amount: isRefund ? Math.min(-billing.balance, billing.amountPaid) : Math.max(0, billing.balance),
                method: "ZELLE",
                reference: "",
                notes: "",
              }}
              onSubmit={async (data: PaymentFormInput) => {
                await mutate({ billingId, ...data, notes: data.notes ?? "" });
              }}
            >
              {(form) => (
                <div className="space-y-4">
                  {isRefund && <p className="text-sm text-muted-foreground">Record this only after returning the money. It reduces collected income on the refund date.</p>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormFeilds name="paymentDate" label={isRefund ? "Refund Date" : "Payment Date"} type="date" />
                    <FormFeilds name="amount" label="Amount ($)" type="number" />
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
