"use client";

import { Percent, CalendarClock } from "lucide-react";

import type { StudioSettingsData } from "@/actions/settings";
import {
  discountSettingsSchema,
  reminderSettingsSchema,
  type DiscountSettingsInput,
  type ReminderSettingsInput,
} from "@/actions/settings.schema";
import { Button } from "@/components/common/button";
import { Card, CardTitle } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { useMutate } from "@/hooks/useMutate";

export function DiscountForm({ settings }: { settings: StudioSettingsData }) {
  const { mutate: updateSettings, isLoading } = useMutate("updateStudioSettings", {
    invalidateKeys: ["getStudioSettings"],
  });

  return (
    <FORM
      schema={discountSettingsSchema}
      defaultValues={{
        multiClassDiscountPct: settings.multiClassDiscountPct,
        siblingDiscountPct: settings.siblingDiscountPct,
      }}
      onSubmit={(data) => {
        updateSettings(data);
      }}
    >
      {(form) => (
        <Card
          header={
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="h-4 w-4" />
              Discount Policy
            </CardTitle>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormFeilds<DiscountSettingsInput>
                name="multiClassDiscountPct"
                label="Multi-Class Discount"
                type="number"
                placeholder="0.05"
              />
              <FormFeilds<DiscountSettingsInput>
                name="siblingDiscountPct"
                label="Sibling Discount"
                type="number"
                placeholder="0.05"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter as a decimal fraction of tuition, e.g. 0.05 for 5%. Applied automatically when
              generating monthly billing.
            </p>
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                {isLoading ? "Saving..." : "Save Discount Policy"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </FORM>
  );
}

export function ReminderForm({ settings }: { settings: StudioSettingsData }) {
  const { mutate: updateSettings, isLoading } = useMutate("updateStudioSettings", {
    invalidateKeys: ["getStudioSettings"],
  });

  return (
    <FORM
      schema={reminderSettingsSchema}
      defaultValues={{
        dueDayOfMonth: settings.dueDayOfMonth,
        paymentReminderDaysAfterDue: settings.paymentReminderDaysAfterDue,
      }}
      onSubmit={(data) => {
        updateSettings(data);
      }}
    >
      {(form) => (
        <Card
          header={
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              Due Date & Payment Reminders
            </CardTitle>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormFeilds<ReminderSettingsInput>
                name="dueDayOfMonth"
                label="Due Day of Month"
                type="number"
                placeholder="5"
              />
              <FormFeilds<ReminderSettingsInput>
                name="paymentReminderDaysAfterDue"
                label="Reminder Days After Due"
                type="number"
                placeholder="7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A bill for a given month is due on this day of that month. A daily scheduled job
              emails a one-time payment reminder to any family still Unpaid/Partial this many days
              after their due date.
            </p>
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                {isLoading ? "Saving..." : "Save Reminder Settings"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </FORM>
  );
}
