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
    <Modal open onOpenChange={(open) => !open && onClose()} className="max-w-sm">
      {({ close }) => (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Override Class Fee</h3>
            <p className="text-sm text-muted-foreground">
              Only affects this class&apos;s fee for this month. Bills already generated need
              &ldquo;Recalculate&rdquo; on the bill detail page to pick this up.
            </p>
          </div>

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
              {(form) => (
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
                  <FormFeilds name="notes" label="Notes" type="textarea" placeholder="e.g. extra session added Sept 20" />
                  {Boolean(error) && <p className="text-sm text-destructive">Could not save. Please try again.</p>}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={close}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving || !form.formState.isValid}>
                      {isSaving ? "Saving..." : "Save Override"}
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
