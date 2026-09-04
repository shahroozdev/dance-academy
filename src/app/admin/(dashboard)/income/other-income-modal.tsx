"use client";

import { otherIncomeCreateSchema, type OtherIncomeCreateInput } from "@/actions/other-income.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

const CATEGORY_OPTIONS = [
  { label: "Registration Fee", value: "REGISTRATION_FEE" },
  { label: "Workshop/Camp", value: "WORKSHOP_CAMP" },
  { label: "Performance Fee", value: "PERFORMANCE_FEE" },
  { label: "Costume Income", value: "COSTUME_INCOME" },
  { label: "Private Lesson", value: "PRIVATE_LESSON" },
  { label: "Miscellaneous", value: "MISCELLANEOUS" },
];

const METHOD_OPTIONS = [
  { label: "Zelle", value: "ZELLE" },
  { label: "Cash", value: "CASH" },
  { label: "Check", value: "CHECK" },
  { label: "Other", value: "OTHER" },
];

function todayValue(): string {
  return new Date().toISOString().split("T")[0];
}

export function OtherIncomeModal({ id, onClose }: { id: string | "new"; onClose: () => void }) {
  const isNew = id === "new";
  const { data: income, isLoading } = useQuery("getOtherIncomeById", [isNew ? "" : id], { enabled: !isNew });

  const { mutate: create, isLoading: isCreating, error: createError } = useMutate("createOtherIncome", {
    invalidateKeys: ["getOtherIncome"],
    onSuccess: onClose,
  });
  const { mutate: update, isLoading: isUpdating, error: updateError } = useMutate("updateOtherIncome", {
    invalidateKeys: ["getOtherIncome", "getOtherIncomeById"],
    onSuccess: onClose,
  });

  const isSaving = isCreating || isUpdating;
  const error = createError ?? updateError;

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} className="max-w-md">
      {({ close }) => (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{isNew ? "Add Other Income" : "Edit Other Income"}</h3>

          {!isNew && (isLoading || !income) ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <FORM
              schema={otherIncomeCreateSchema}
              defaultValues={{
                date: income?.date ? new Date(income.date).toISOString().split("T")[0] : todayValue(),
                category: income?.category ?? "MISCELLANEOUS",
                description: income?.description ?? "",
                amount: income?.amount ?? 0,
                paymentMethod: income?.paymentMethod ?? "CASH",
                notes: income?.notes ?? "",
              }}
              onSubmit={async (data: OtherIncomeCreateInput) => {
                if (isNew) await create(data);
                else await update(id, data);
              }}
            >
              {(form) => (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormFeilds name="date" label="Date" type="date" />
                    <FormFeilds name="category" label="Category" type="select" options={CATEGORY_OPTIONS} />
                  </div>
                  <FormFeilds name="description" label="Description" placeholder="e.g. Fall workshop fees" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormFeilds name="amount" label="Amount ($)" type="number" />
                    <FormFeilds name="paymentMethod" label="Payment Method" type="select" options={METHOD_OPTIONS} />
                  </div>
                  <FormFeilds name="notes" label="Notes" type="textarea" />
                  {Boolean(error) && <p className="text-sm text-destructive">Could not save. Please try again.</p>}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={close}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving || !form.formState.isValid}>
                      {isSaving ? "Saving..." : "Save Income"}
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
