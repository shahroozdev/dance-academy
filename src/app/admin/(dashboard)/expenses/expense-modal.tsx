"use client";

import { expenseCreateSchema, type ExpenseCreateInput } from "@/actions/expenses.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

const CATEGORY_OPTIONS = [
  { label: "Studio Rent", value: "STUDIO_RENT" },
  { label: "Instructor/Choreographer", value: "INSTRUCTOR_CHOREOGRAPHER" },
  { label: "Costumes", value: "COSTUMES" },
  { label: "Jewelry/Props", value: "JEWELRY_PROPS" },
  { label: "Competition/Event Fees", value: "COMPETITION_EVENT_FEES" },
  { label: "Advertising", value: "ADVERTISING" },
  { label: "Software/Subscriptions", value: "SOFTWARE_SUBSCRIPTIONS" },
  { label: "Music/Editing", value: "MUSIC_EDITING" },
  { label: "Supplies", value: "SUPPLIES" },
  { label: "Travel", value: "TRAVEL" },
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

export function ExpenseModal({ id, onClose }: { id: string | "new"; onClose: () => void }) {
  const isNew = id === "new";
  const { data: expense, isLoading } = useQuery("getExpenseById", [isNew ? "" : id], { enabled: !isNew });

  const { mutate: create, isLoading: isCreating, error: createError } = useMutate("createExpense", {
    invalidateKeys: ["getExpenses"],
    onSuccess: onClose,
  });
  const { mutate: update, isLoading: isUpdating, error: updateError } = useMutate("updateExpense", {
    invalidateKeys: ["getExpenses", "getExpenseById"],
    onSuccess: onClose,
  });

  const isSaving = isCreating || isUpdating;
  const error = createError ?? updateError;

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} className="max-w-md">
      {({ close }) => (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{isNew ? "Add Expense" : "Edit Expense"}</h3>

          {!isNew && (isLoading || !expense) ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <FORM
              schema={expenseCreateSchema}
              defaultValues={{
                date: expense?.date ? new Date(expense.date).toISOString().split("T")[0] : todayValue(),
                category: expense?.category ?? "MISCELLANEOUS",
                description: expense?.description ?? "",
                amount: expense?.amount ?? 0,
                paymentMethod: expense?.paymentMethod ?? "CASH",
                notes: expense?.notes ?? "",
              }}
              onSubmit={async (data: ExpenseCreateInput) => {
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
                  <FormFeilds name="description" label="Description" placeholder="e.g. September studio rent" />
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
                      {isSaving ? "Saving..." : "Save Expense"}
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
