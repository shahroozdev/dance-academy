"use client";

import { Info } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useReducer, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Skeleton } from "@/components/common/skeleton";
import { Switch } from "@/components/common/switch";
import TooltipWrapper from "@/components/common/TooltipWrapper";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { enrollmentDateInputValue } from "@/lib/enrollment-date";
import { todayIsoDate } from "@/lib/utils";

const AUTO = "AUTO";
const selectionSchema = z.object({
  familyId: z.string().min(1),
  classId: z.string().min(1, "Select the student's final class"),
  firstBillableDate: z.iso.date("Select the first date this student should be billed"),
  sendEmailNow: z.boolean(),
});
const defaults = { familyId: AUTO, classId: "", firstBillableDate: todayIsoDate(), sendEmailNow: true };
const FAMILY_PAGE_SIZE = 25;

type FamilyOption = {
  id: string;
  familyName: string;
  parentGuardianName: string;
  phone: string;
  email: string | null;
};

type FamilySearchState = { search: string; page: number; pages: number; items: FamilyOption[] };
type FamilySearchAction =
  | { type: "search"; search: string }
  | { type: "next" }
  | { type: "results"; search: string; page: number; pages: number; items: FamilyOption[] };

const initialFamilySearchState: FamilySearchState = { search: "", page: 1, pages: 1, items: [] };

function familySearchReducer(state: FamilySearchState, action: FamilySearchAction): FamilySearchState {
  if (action.type === "search") return { search: action.search, page: 1, pages: 1, items: [] };
  if (action.type === "next") return state.page < state.pages ? { ...state, page: state.page + 1 } : state;
  if (action.search !== state.search || action.page !== state.page) return state;
  const items = action.page === 1
    ? action.items
    : Array.from(new Map([...state.items, ...action.items].map((item) => [item.id, item])).values());
  return { ...state, pages: action.pages, items };
}

export function RegistrationApprovalForm({ id, requestedProgramId, onClose }: { id: string; requestedProgramId: string | null; onClose: () => void }) {
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [familySearch, dispatchFamilySearch] = useReducer(familySearchReducer, initialFamilySearchState);
  const deferredFamilySearch = useDeferredValue(familySearch.search);
  const { data: familyPage, isLoading: familiesLoading, error: familiesError } = useQuery("getRegistrationFamilyOptions", [{
    search: deferredFamilySearch || undefined,
    page: familySearch.page,
    pageSize: FAMILY_PAGE_SIZE,
  }]);
  const { data: classes, isLoading: classesLoading, error: classesError } = useQuery("getRegistrationAssignmentClasses", []);
  useEffect(() => {
    if (familiesLoading || !familyPage) return;
    dispatchFamilySearch({
      type: "results",
      search: deferredFamilySearch,
      page: familyPage.page,
      pages: familyPage.pages,
      items: familyPage.data,
    });
  }, [deferredFamilySearch, familiesLoading, familyPage]);
  const searchFamilies = useCallback((search: string) => dispatchFamilySearch({ type: "search", search }), []);
  const loadMoreFamilies = useCallback(() => dispatchFamilySearch({ type: "next" }), []);
  const options = useMemo(() => [
    { value: AUTO, label: "Automatic matching (phone or email)" },
    ...familySearch.items.map(family => ({
      value: family.id,
      label: `${family.familyName} — ${family.parentGuardianName} · ${family.phone}${family.email ? ` · ${family.email}` : ""}`,
    })),
  ], [familySearch.items]);
  const classOptions = useMemo(() => (classes ?? [])
    .filter(item => !requestedProgramId || item.program.id === requestedProgramId)
    .map(item => ({
    value: item.id,
    label: `${item.program.name} — ${item.name}`,
  })), [classes, requestedProgramId]);
  const { mutate: approve, isLoading: isApproving, error: approveError } = useMutate("approveRegistrationRequest", {
    invalidateKeys: ["getRegistrationRequests", "getRegistrationFamilyOptions", "getFamilies", "getStudents", "getEnrollments", "getMonthlyBillings", "getAdminNotificationSummary"],
    onSuccess: (result) => {
      if (result.enrollmentEmail.requested && !result.enrollmentEmail.sent) {
        setEmailWarning(result.enrollmentEmail.error ?? "The enrollment email was not sent.");
        return;
      }
      onClose();
    },
  });
  const { mutate: reject, isLoading: isRejecting, error: rejectError } = useMutate("rejectRegistrationRequest", {
    invalidateKeys: ["getRegistrationRequests"],
    onSuccess: onClose,
  });
  const busy = isApproving || isRejecting;

  if (emailWarning) {
    return (
      <div className="space-y-4 rounded-md border p-4">
        <p className="font-medium">Enrollment finalized</p>
        <p className="text-sm text-muted-foreground">The student was enrolled successfully, but the confirmation email was not sent: {emailWarning}</p>
        <p className="text-sm text-muted-foreground">Close this review and use <strong>Send Enrollment Email</strong> from the Processed registrations list when ready.</p>
        <Button type="button" className="w-full" onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <FORM schema={selectionSchema} defaultValues={defaults} onSubmit={async ({ familyId, classId, firstBillableDate, sendEmailNow }) => {
      if (busy) return;
      try { await approve(id, classId, firstBillableDate, familyId === AUTO ? undefined : familyId, sendEmailNow); } catch { /* Mutation error is shown below. */ }
    }} className="space-y-4">
      {(form) => (
        <>
          <FormFeilds
            name="familyId"
            label="Link to existing family"
            type="search-select"
            options={options}
            searchPlaceholder="Search by family, parent, phone, or email..."
            emptyMessage="No matching active families."
            isLoading={familiesLoading}
            hasMore={familySearch.page < familySearch.pages}
            onSearchChange={searchFamilies}
            onLoadMore={loadMoreFamilies}
            disabled={busy}
          />
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
            Select this only after the student&apos;s level and batch have been evaluated. Finalizing creates the enrollment in this class.
          </p>
          <FormFeilds
            name="firstBillableDate"
            label="First Billable Date"
            type="date"
            min={enrollmentDateInputValue(classes?.find((item) => item.id === form.watch("classId"))?.firstClassDate)}
            disabled={busy}
            required
          />
          <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            Select the first class date this student should be charged for. Sessions before this date are excluded; a class held on this date or later is included.
          </p>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="send-enrollment-email" className="text-sm font-medium">Send enrollment confirmation email now</label>
              <TooltipWrapper label="Turn this off if you want to finalize the enrollment now and send the confirmation email later from the Processed registrations list.">
                <button type="button" aria-label="About sending the enrollment email later" className="text-muted-foreground hover:text-foreground">
                  <Info className="size-4" />
                </button>
              </TooltipWrapper>
            </div>
            <Switch
              id="send-enrollment-email"
              checked={form.watch("sendEmailNow")}
              onCheckedChange={(checked) => form.setValue("sendEmailNow", checked, { shouldDirty: true })}
              disabled={busy}
              aria-label="Send enrollment confirmation email now"
            />
          </div>
          {Boolean(familiesError) && <p role="alert" className="text-sm text-destructive">Could not load matching families. You can keep automatic matching or search again.</p>}
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
