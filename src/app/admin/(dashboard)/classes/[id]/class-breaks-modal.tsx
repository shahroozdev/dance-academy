"use client";

import { classBillingPauseSchema } from "@/actions/class-pauses.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { useMutate } from "@/hooks/useMutate";

type ClassBreak = { id: string; startMonth: Date; endMonth: Date; reason: string | null };

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return new Date(date).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function ClassBreaksModal({ classId, className, breaks }: { classId: string; className: string; breaks: ClassBreak[] }) {
  const { mutate: addBreak, isLoading: isAdding, error } = useMutate("createClassBillingPause", {
    invalidateKeys: ["getClassById", "getClasses", "getMonthlyBillings"],
  });
  const { mutate: removeBreak, isLoading: isRemoving } = useMutate("deleteClassBillingPause", {
    invalidateKeys: ["getClassById", "getClasses", "getMonthlyBillings"],
  });

  return (
    <Modal trigger={<Button variant="outline">Class Breaks</Button>} className="max-w-lg" title={`Summer Break / Inactive Months — ${className}`}>
      {() => (
        <div className="space-y-5">
          {breaks.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{monthLabel(item.startMonth)} through {monthLabel(item.endMonth)}</p>
                {item.reason && <p className="text-muted-foreground">{item.reason}</p>}
              </div>
              <Button size="sm" variant="destructive" disabled={isRemoving} onClick={() => removeBreak(item.id)}>Remove</Button>
            </div>
          ))}
          {breaks.length === 0 && <p className="text-sm text-muted-foreground">No class breaks are scheduled.</p>}
          <FORM
            schema={classBillingPauseSchema}
            defaultValues={{ startMonth: currentMonth(), endMonth: currentMonth(), reason: "" }}
            onSubmit={async (data) => { await addBreak(classId, data); }}
          >
            {() => (
              <div className="space-y-4 border-t pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormFeilds name="startMonth" label="Break Starts" type="month" required />
                  <FormFeilds name="endMonth" label="Break Ends" type="month" required />
                </div>
                <FormFeilds name="reason" label="Reason" placeholder="e.g. Summer break" />
                <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Automatic billing excludes this class for every selected month and resumes afterward. Existing unpaid family bills recalculate automatically; bills with payments remain protected.
                </p>
                {Boolean(error) && <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Could not schedule this class break."}</p>}
                <Button type="submit" className="w-full" disabled={isAdding}>{isAdding ? "Saving..." : "Schedule Class Break"}</Button>
              </div>
            )}
          </FORM>
        </div>
      )}
    </Modal>
  );
}
