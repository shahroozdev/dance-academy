"use client";

import { billingAdjustmentSchema, type BillingAdjustmentInput } from "@/actions/billing.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { Skeleton } from "@/components/common/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

export function AdjustmentModal({ billingId, onClose }: { billingId: string; onClose: () => void }) {
  const { data: billing, isLoading } = useQuery("getMonthlyBillingById", [billingId]);
  const {
    mutate,
    isLoading: isSaving,
    error,
  } = useMutate("setBillingAdjustment", {
    invalidateKeys: ["getMonthlyBillings", "getMonthlyBillingById"],
    onSuccess: onClose,
  });

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      className="max-w-sm"
      title={
        <div>
          Adjustment
          <p className="text-sm font-normal text-muted-foreground">
            A one-month change. It never touches the class rate or other months. Use a
            negative amount for a discount or refund, a positive amount to add a charge.
          </p>
        </div>
      }
    >
      {({ close }) => {
        if (isLoading || !billing) {
          return <Skeleton className="h-32 w-full" />;
        }
        return (
          <FORM
              schema={billingAdjustmentSchema}
              defaultValues={{ adjustment: billing.adjustment, adjustmentNotes: billing.adjustmentNotes ?? "" }}
              onSubmit={async (data: BillingAdjustmentInput) => {
                await mutate(billingId, data);
              }}
            >
              {(form) => (
                <div className="space-y-4">
                  <FormFeilds name="adjustment" label="Adjustment ($)" type="number" placeholder="e.g. -20 or 20" />
                  <FormFeilds
                    name="adjustmentNotes"
                    label="Note"
                    type="textarea"
                    placeholder="e.g. class cancelled Sept 14, or refund for..."
                  />
                  {billing.status === "PAID" && (
                    <p className="text-sm text-muted-foreground">
                      A negative adjustment reduces the fee and shows the credit as Overpaid.
                      After returning the money, use Record Refund to record the amount and date.
                    </p>
                  )}
                  {Boolean(error) && (
                    <p className="text-sm text-destructive">Could not save the adjustment. Please try again.</p>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={close}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving || !form.formState.isValid}>
                      {isSaving ? "Saving..." : "Save Adjustment"}
                    </Button>
                  </div>
                </div>
              )}
            </FORM>
        );
      }}
    </Modal>
  );
}
