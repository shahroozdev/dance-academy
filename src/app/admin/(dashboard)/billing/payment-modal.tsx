"use client";

import { paymentCreateSchema } from "@/actions/payments.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { Skeleton } from "@/components/ui/skeleton";
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
type PaymentFormInput = z.infer<typeof paymentFormSchema>;

export function PaymentModal({ billingId, onClose }: { billingId: string; onClose: () => void }) {
  const { data: billing, isLoading } = useQuery("getMonthlyBillingById", [billingId]);
  const {
    mutate,
    isLoading: isSaving,
    error,
  } = useMutate("createPayment", {
    invalidateKeys: ["getMonthlyBillings", "getMonthlyBillingById", "getPayments"],
    onSuccess: onClose,
  });

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} className="max-w-sm">
      {({ close }) => (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Record Payment</h3>
            {billing && (
              <p className="text-sm text-muted-foreground">
                {billing.student.fullName} — balance due {formatCurrency(billing.balance)}
              </p>
            )}
          </div>

          {isLoading || !billing ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <FORM
              schema={paymentFormSchema}
              defaultValues={{
                paymentDate: todayValue(),
                amount: billing.balance > 0 ? billing.balance : billing.finalAmountDue,
                method: "ZELLE",
                reference: "",
                notes: "",
              }}
              onSubmit={async (data: PaymentFormInput) => {
                await mutate({ billingId, ...data });
              }}
            >
              {(form) => (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormFeilds name="paymentDate" label="Payment Date" type="date" />
                    <FormFeilds name="amount" label="Amount ($)" type="number" />
                  </div>
                  <FormFeilds name="method" label="Method" type="select" options={METHOD_OPTIONS} />
                  <FormFeilds name="reference" label="Reference" placeholder="e.g. Zelle confirmation #" />
                  <FormFeilds name="notes" label="Notes" type="textarea" />
                  {Boolean(error) && (
                    <p className="text-sm text-destructive">Could not record the payment. Please try again.</p>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={close}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving || !form.formState.isValid}>
                      {isSaving ? "Saving..." : "Record Payment"}
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
