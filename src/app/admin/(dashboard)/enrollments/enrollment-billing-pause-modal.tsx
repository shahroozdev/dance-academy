"use client";

import { enrollmentBillingPauseSchema } from "@/actions/enrollments.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { useMutate } from "@/hooks/useMutate";

type BillingPause = {
  id: string;
  startMonth: Date;
  endMonth: Date;
  reason: string | null;
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(value: Date) {
  return new Date(value).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function EnrollmentBillingPauseModal({
  enrollmentId,
  studentName,
  pauses,
  open,
  onOpenChange,
}: {
  enrollmentId: string;
  studentName: string;
  pauses: BillingPause[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { mutate: createPause, isLoading: isCreating, error } = useMutate("createEnrollmentBillingPause", {
    invalidateKeys: ["getEnrollments", "getMonthlyBillings", "getStudentById"],
  });
  const { mutate: removePause, isLoading: isDeleting } = useMutate("deleteEnrollmentBillingPause", {
    invalidateKeys: ["getEnrollments", "getMonthlyBillings", "getStudentById"],
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      trigger={open === undefined ? <Button size="sm" variant="outline">Billing Pauses</Button> : undefined}
      className="max-w-lg"
      title={
        <div>
          Billing Pauses
          <p className="text-sm font-normal text-muted-foreground">
            Keep {studentName} enrolled while excluding complete billing months.
          </p>
        </div>
      }
    >
      {() => (
        <div className="space-y-5">
          {pauses.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Saved pauses</p>
              {pauses.map((pause) => (
                <div key={pause.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="text-sm">
                    <p className="font-medium">{monthLabel(pause.startMonth)} through {monthLabel(pause.endMonth)}</p>
                    {pause.reason && <p className="text-muted-foreground">{pause.reason}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => removePause(pause.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
          <FORM
            schema={enrollmentBillingPauseSchema}
            defaultValues={{ startMonth: currentMonth(), endMonth: currentMonth(), reason: "" }}
            onSubmit={(data) => createPause(enrollmentId, data)}
            className="space-y-4"
          >
            {() => (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormFeilds name="startMonth" label="Pause From Month" type="month" required />
                  <FormFeilds name="endMonth" label="Pause Through Month" type="month" required />
                </div>
                <FormFeilds name="reason" label="Reason / Note" placeholder="e.g. family vacation" />
                <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                  The student remains enrolled but receives no class charge for each selected month. Billing resumes automatically in the following month. Recalculate an existing unpaid bill after adding or removing a pause.
                </p>
                {Boolean(error) && <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Could not save the billing pause."}</p>}
                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? "Saving..." : "Add Billing Pause"}
                </Button>
              </>
            )}
          </FORM>
        </div>
      )}
    </Modal>
  );
}
