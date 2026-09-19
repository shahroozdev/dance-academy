"use client";

import { classExtraSessionSchema, type ClassExtraSessionInput } from "@/actions/extra-sessions.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

function defaultDate(month: string) {
  const today = new Date().toISOString().slice(0, 10);
  return today.startsWith(month) ? today : `${month}-01`;
}

export function ExtraSessionsModal({ classId, className, month }: {
  classId: string;
  className: string;
  month: string;
}) {
  const { data: sessions, isLoading } = useQuery("getClassExtraSessions", [classId, month]);
  const { mutate: createSession, isLoading: isCreating, error } = useMutate("createClassExtraSession", {
    invalidateKeys: ["getClassExtraSessions", "getClassMonthlyFees", "getMonthlyBillings"],
  });
  const { mutate: deleteSession, isLoading: isDeleting } = useMutate("deleteClassExtraSession", {
    invalidateKeys: ["getClassExtraSessions", "getClassMonthlyFees", "getMonthlyBillings"],
  });

  return (
    <Modal
      trigger={<Button size="sm" variant="outline">Extra Sessions</Button>}
      className="max-w-xl"
      title={
        <div>
          Extra Sessions — {className}
          <p className="text-sm font-normal text-muted-foreground">
            Add every rehearsal separately. Each enrolled student is charged only when the session date falls within their enrollment.
          </p>
        </div>
      }
    >
      {() => (
        <div className="space-y-5">
          {isLoading && <Skeleton className="h-24 w-full" />}
          {!isLoading && sessions?.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{session.title} — ${session.amount.toFixed(2)}</p>
                <p className="text-muted-foreground">
                  {new Date(session.sessionDate).toLocaleDateString("en-US", { timeZone: "UTC" })} · {session.quantity} {session.billingUnit === "HOUR" ? "hour(s)" : "session(s)"} × ${session.rate.toFixed(2)}
                </p>
                {session.notes && <p className="text-muted-foreground">{session.notes}</p>}
              </div>
              <Button size="sm" variant="destructive" disabled={isDeleting} onClick={() => deleteSession(session.id)}>
                Remove
              </Button>
            </div>
          ))}
          {!isLoading && sessions?.length === 0 && (
            <p className="text-sm text-muted-foreground">No extra sessions have been added for this month.</p>
          )}
          <FORM
            schema={classExtraSessionSchema}
            defaultValues={{ classId, sessionDate: defaultDate(month), title: "Additional rehearsal", billingUnit: "SESSION", quantity: 1, rate: 0, notes: "" }}
            onSubmit={async (data: ClassExtraSessionInput) => { await createSession(data); }}
          >
            {(form) => {
              const amount = Number(form.watch("quantity") || 0) * Number(form.watch("rate") || 0);
              return (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormFeilds name="sessionDate" label="Session Date" type="date" required />
                    <FormFeilds name="title" label="Session Name" required />
                    <FormFeilds name="billingUnit" label="Charge By" type="select" options={[{ label: "Per session", value: "SESSION" }, { label: "Per hour", value: "HOUR" }]} required />
                    <FormFeilds name="quantity" label="Sessions / Hours" type="number" required />
                    <FormFeilds name="rate" label="Rate ($)" type="number" required />
                  </div>
                  <FormFeilds name="notes" label="Notes" type="textarea" placeholder="Performance or rehearsal details" />
                  <p className="rounded-md border bg-muted/30 p-3 text-sm">Additional charge per enrolled student: <strong>${amount.toFixed(2)}</strong></p>
                  <p className="text-xs text-muted-foreground">Saving or removing sessions automatically recalculates affected unpaid bills. Finalize the class fee before notifying parents; bills with payments remain protected.</p>
                  {Boolean(error) && <p className="text-sm text-destructive">Could not save the extra session.</p>}
                  <Button type="submit" className="w-full" disabled={isCreating}>{isCreating ? "Saving..." : "Add Extra Session"}</Button>
                </div>
              );
            }}
          </FORM>
        </div>
      )}
    </Modal>
  );
}
