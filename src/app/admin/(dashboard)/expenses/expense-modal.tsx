"use client";

import { Paperclip } from "lucide-react";
import { useRef, useState } from "react";

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

function receiptButtonLabel(isUploading: boolean, hasReceipt: boolean): string {
  if (isUploading) return "Uploading...";
  return hasReceipt ? "Replace Receipt" : "Attach Receipt";
}

export function ExpenseModal({ id, onClose }: { id: string | "new"; onClose: () => void }) {
  const isNew = id === "new";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptUploadError, setReceiptUploadError] = useState(false);
  const { data: expense, isLoading } = useQuery("getExpenseById", [isNew ? "" : id], { enabled: !isNew });

  const { mutate: create, isLoading: isCreating, error: createError } = useMutate("createExpense", {
    invalidateKeys: ["getExpenses"],
    onSuccess: onClose,
  });
  const { mutate: update, isLoading: isUpdating, error: updateError } = useMutate("updateExpense", {
    invalidateKeys: ["getExpenses", "getExpenseById"],
    onSuccess: onClose,
  });
  const { mutate: uploadReceipt } = useMutate("uploadExpenseReceipt");
  const { mutate: remove, isLoading: isDeleting } = useMutate("deleteExpense", {
    invalidateKeys: ["getExpenses"],
    onSuccess: onClose,
  });
  const { data: teachersData } = useQuery("getTeachers", [{ isActive: true, pageSize: 100, sortBy: "name" }]);
  const teacherOptions = teachersData?.data.map((t) => ({ label: t.name, value: t.id })) ?? [];

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
                receiptUrl: expense?.receiptUrl ?? "",
                teacherId: expense?.teacherId ?? "",
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
                  <FormFeilds
                    name="teacherId"
                    label="Teacher"
                    type="select"
                    options={teacherOptions}
                    placeholder="Not linked to a teacher"
                  />
                  <FormFeilds name="notes" label="Notes" type="textarea" />

                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">Receipt</p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingReceipt}
                      >
                        <Paperclip className="size-4" />
                        {receiptButtonLabel(isUploadingReceipt, Boolean(form.watch("receiptUrl")))}
                      </Button>
                      {form.watch("receiptUrl") && (
                        <a
                          href={form.watch("receiptUrl")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary underline underline-offset-2"
                        >
                          View current
                        </a>
                      )}
                    </div>
                    {receiptUploadError && (
                      <p className="text-sm text-destructive">Could not upload receipt. Please try again.</p>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;

                        setReceiptUploadError(false);
                        setIsUploadingReceipt(true);
                        const formData = new FormData();
                        formData.append("receipt", file);
                        try {
                          const result = await uploadReceipt(formData);
                          form.setValue("receiptUrl", result.url, { shouldDirty: true, shouldValidate: true });
                        } catch {
                          setReceiptUploadError(true);
                        } finally {
                          setIsUploadingReceipt(false);
                        }
                      }}
                    />
                  </div>

                  {Boolean(error) && <p className="text-sm text-destructive">Could not save. Please try again.</p>}
                  <div className="flex items-center justify-between gap-2 pt-2">
                    {!isNew ? (
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={isDeleting}
                        onClick={() => {
                          if (window.confirm("Delete this expense? This can't be undone.")) remove(id);
                        }}
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </Button>
                    ) : (
                      <span />
                    )}
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={close}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSaving || !form.formState.isValid}>
                        {isSaving ? "Saving..." : "Save Expense"}
                      </Button>
                    </div>
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
