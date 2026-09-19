"use client";

import { classMonthlyFeeUpdateSchema, type ClassMonthlyFeeUpdateInput } from "@/actions/class-fees.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

export function ClassFeeEditModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: fee, isLoading } = useQuery("getClassMonthlyFeeById", [id]);
  const {
    mutate,
    isLoading: isSaving,
    error,
  } = useMutate("updateClassMonthlyFee", {
    invalidateKeys: ["getClassMonthlyFees"],
    onSuccess: onClose,
  });

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      className="max-w-sm"
      title={
        <div>
          Override Class Fee
          <p className="text-sm font-normal text-muted-foreground">
            Only affects this class for this month. Enter the total sessions and exact fee after
            cancellations or extra rehearsals. Affected unpaid bills recalculate automatically; the Recalculate Bills action remains available as a backup.
          </p>
        </div>
      }
    >
      {({ close }) => (
        <div className="space-y-4">
          {isLoading || !fee ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <FORM
              schema={classMonthlyFeeUpdateSchema}
              defaultValues={{
                billableSessions: fee.billableSessions ?? undefined,
                rate: fee.rate ?? undefined,
                flatFee: fee.flatFee ?? undefined,
                monthlyClassFee: fee.monthlyClassFee,
                notes: fee.notes ?? "",
              }}
              onSubmit={async (data: ClassMonthlyFeeUpdateInput) => {
                await mutate(id, data);
              }}
            >
              {(form) => {
                const sessions = Number(form.watch("billableSessions") ?? 0);
                const rate = Number(form.watch("rate") ?? 0);
                const calculatedFee = Math.round((sessions * rate + Number.EPSILON) * 100) / 100;

                return (
                <div className="space-y-4">
                  <p className="text-sm font-medium">{fee.class.name}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormFeilds name="billableSessions" label="Billable Sessions" type="number" />
                    <FormFeilds name="rate" label="Rate ($)" type="number" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormFeilds name="flatFee" label="Flat Fee ($)" type="number" />
                    <FormFeilds name="monthlyClassFee" label="Monthly Class Fee ($)" type="number" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={!Number.isFinite(calculatedFee) || sessions < 0 || rate < 0}
                    onClick={() => form.setValue("monthlyClassFee", calculatedFee, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })}
                  >
                    Use {sessions} sessions × ${rate.toFixed(2)} = ${calculatedFee.toFixed(2)}
                  </Button>
                  <FormFeilds name="notes" label="Notes" type="textarea" placeholder="e.g. extra session added Sept 20" />
                  <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                    Extra rehearsals: increase Billable Sessions and use the calculation button when every session has the same rate. For hourly or differently priced rehearsals, enter the exact total Monthly Class Fee and describe the calculation in Notes. This changes every enrolled student&apos;s unpaid bill for this class-month only.
                  </p>
                  {Boolean(error) && <p className="text-sm text-destructive">Could not save. Please try again.</p>}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={close}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Override"}
                    </Button>
                  </div>
                </div>
                );
              }}
            </FORM>
          )}
        </div>
      )}
    </Modal>
  );
}
