"use client";

import { billingAdjustmentSchema, type BillingAdjustmentInput } from "@/actions/billing.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { Skeleton } from "@/components/ui/skeleton";
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
    <Modal open onOpenChange={(open) => !open && onClose()} className="max-w-sm">
      {({ close }) => {
        let body: React.ReactNode;
        if (isLoading || !billing) {
          body = <Skeleton className="h-32 w-full" />;
        } else if (billing.status === "PAID") {
          body = (
            <p className="text-sm text-destructive">
              This bill is fully paid. Record a payment adjustment first, then reopen it before
              changing the manual adjustment.
            </p>
          );
        } else {
          body = (
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
                    placeholder="e.g. class cancelled Sept 14"
                  />
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
        }

        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Adjustment</h3>
              <p className="text-sm text-muted-foreground">
                A one-month change. It never touches the class rate or other months.
              </p>
            </div>

            {body}
          </div>
        );
      }}
    </Modal>
  );
}
