"use client";

import { useMemo } from "react";
import { z } from "zod";

import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Skeleton } from "@/components/common/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

const AUTO = "AUTO";
const selectionSchema = z.object({
  familyId: z.string().min(1),
  classId: z.string().min(1, "Select the student's final class"),
});
const defaults = { familyId: AUTO, classId: "" };

export function RegistrationApprovalForm({ id, requestedProgramId, onClose }: { id: string; requestedProgramId: string | null; onClose: () => void }) {
  const { data: families, isLoading, error } = useQuery("getRegistrationFamilyOptions", []);
  const { data: classes, isLoading: classesLoading, error: classesError } = useQuery("getRegistrationAssignmentClasses", []);
  const options = useMemo(() => [
    { value: AUTO, label: "Automatic matching (phone or email)" },
    ...(families ?? []).map(family => ({
      value: family.id,
      label: `${family.familyName} — ${family.parentGuardianName} · ${family.phone}${family.email ? ` · ${family.email}` : ""}`,
    })),
  ], [families]);
  const classOptions = useMemo(() => (classes ?? [])
    .filter(item => !requestedProgramId || item.program.id === requestedProgramId)
    .map(item => ({
    value: item.id,
    label: `${item.program.name} — ${item.name}`,
  })), [classes, requestedProgramId]);
  const { mutate: approve, isLoading: isApproving, error: approveError } = useMutate("approveRegistrationRequest", {
    invalidateKeys: ["getRegistrationRequests", "getRegistrationFamilyOptions", "getFamilies", "getStudents", "getEnrollments"],
    onSuccess: onClose,
  });
  const { mutate: reject, isLoading: isRejecting, error: rejectError } = useMutate("rejectRegistrationRequest", {
    invalidateKeys: ["getRegistrationRequests"],
    onSuccess: onClose,
  });
  const busy = isApproving || isRejecting;

  return (
    <FORM schema={selectionSchema} defaultValues={defaults} onSubmit={async ({ familyId, classId }) => {
      if (busy) return;
      try { await approve(id, classId, familyId === AUTO ? undefined : familyId); } catch { /* Mutation error is shown below. */ }
    }} className="space-y-4">
      {(form) => (
        <>
          {isLoading ? <Skeleton className="h-16 w-full" /> : (
            <FormFeilds name="familyId" label="Link to existing family" type="select" options={options} disabled={busy} />
          )}
          <p className="text-sm text-muted-foreground">
            Keep automatic matching, or select a verified family when siblings register with different contact details.
            Linking uses that family&apos;s saved contacts for fee messages; it does not replace them with this registration&apos;s contacts.
          </p>
          {classesLoading ? <Skeleton className="h-16 w-full" /> : (
            <FormFeilds
              name="classId"
              label="Final Level / Batch / Class"
              type="select"
              options={classOptions}
              placeholder="Select the finalized class..."
              disabled={busy || classOptions.length === 0}
              required
            />
          )}
          <p className="text-sm text-muted-foreground">
            Select this only after the student&apos;s level and batch have been evaluated. Finalizing creates the enrollment but does not email the parent.
          </p>
          {Boolean(error) && <p role="alert" className="text-sm text-destructive">Could not load the family list. Close and reopen this review to try again.</p>}
          {Boolean(classesError) && <p role="alert" className="text-sm text-destructive">Could not load active classes. Close and reopen this review to try again.</p>}
          <ApprovalPreview
            key={form.watch("familyId")}
            id={id}
            familyId={form.watch("familyId")}
            busy={busy}
            classSelectionAvailable={!classesLoading && !classesError && classOptions.length > 0}
          />
          {Boolean(approveError) && <p role="alert" className="text-sm text-destructive">
            {approveError instanceof Error ? approveError.message : "Could not approve this registration. Please review the selected family and try again."}
          </p>}
          {Boolean(rejectError) && <p role="alert" className="text-sm text-destructive">Could not reject this registration. Please try again.</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={async () => {
              try { await reject(id); } catch { /* Mutation error is shown above. */ }
            }}>{isRejecting ? "Rejecting..." : "Reject"}</Button>
          </div>
        </>
      )}
    </FORM>
  );
}

function ApprovalPreview({ id, familyId, busy, classSelectionAvailable }: { id: string; familyId: string; busy: boolean; classSelectionAvailable: boolean }) {
  // Remount for each selection so an old family's preview can never enable approval for a new choice.
  const { data: plan, isLoading, error } = useQuery("previewRegistrationApproval", [id, familyId === AUTO ? undefined : familyId]);
  return (
    <>
      {isLoading && <Skeleton className="h-24 w-full" />}
      {Boolean(error) && <p role="alert" className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not preview this match. Select an active family or reopen the review."}
      </p>}
      {!isLoading && !error && plan && (
        <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm" aria-live="polite">
          <p className="font-medium">On finalization:</p>
          <p>Family — {plan.family.action === "match" ? `link to existing "${plan.family.name}"` : `create new "${plan.family.name}"`}</p>
          <p>Student — {plan.student.action === "match" ? "match existing student in that family" : "create new student in that family"}</p>
        </div>
      )}
      <Button type="submit" className="w-full" disabled={busy || isLoading || Boolean(error) || !plan || !classSelectionAvailable}>
        {busy ? "Finalizing..." : "Finalize Enrollment"}
      </Button>
    </>
  );
}
