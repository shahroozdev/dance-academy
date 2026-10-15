"use client";

import { classSessionReportSchema } from "@/actions/class-sessions.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { useMutate } from "@/hooks/useMutate";

const sessionReportFormSchema = classSessionReportSchema.omit({ classId: true, month: true });

type SessionReportModalProps = {
  classId: string;
  className: string;
  month: string;
  scheduledSessions: number;
  additionalSessions: number;
  reportedSessions: number | null;
  reportNotes: string | null;
};

export function SessionReportModal({
  classId,
  className,
  month,
  scheduledSessions,
  additionalSessions,
  reportedSessions,
  reportNotes,
}: SessionReportModalProps) {
  const { mutate: report, isLoading, error } = useMutate("reportMonthlyClassSessions", {
    invalidateKeys: ["getMonthlyClassSessionTracking", "getClassMonthlyFees"],
  });

  return (
    <Modal
      trigger={<Button size="sm" variant="outline">Update Count</Button>}
      className="max-w-md"
      title={`Classes Held — ${className}`}
    >
      {({ close }) => (
        <FORM
          schema={sessionReportFormSchema}
          defaultValues={{
            reportedSessions: reportedSessions ?? scheduledSessions,
            reportNotes: reportNotes ?? "",
          }}
          onSubmit={async (data) => {
            await report({ classId, month, ...data });
            close();
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter regular classes only. The {additionalSessions} separately recorded extra rehearsal(s) are
              already added to billing and shown in the monthly total. Saving automatically updates the expected
              class fee and every student bill for this month. Recorded payments remain unchanged while balances update.
            </p>
            <FormFeilds name="reportedSessions" label="Regular Classes Actually Held" type="number" min="0" required />
            <FormFeilds name="reportNotes" label="Notes" type="textarea" placeholder="Holiday, cancellation, additional class, etc." />
            {Boolean(error) && <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Could not save the class count."}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={close}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? "Updating fees..." : "Save & Update Fees"}</Button>
            </div>
          </div>
        </FORM>
      )}
    </Modal>
  );
}
