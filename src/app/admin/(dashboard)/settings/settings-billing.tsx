"use client";

import { BellRing, Percent, CalendarClock } from "lucide-react";

import type { StudioSettingsData } from "@/actions/settings";
import {
  discountSettingsSchema,
  billingAlertSettingsSchema,
  reminderSettingsSchema,
  type BillingAlertSettingsInput,
  type DiscountSettingsInput,
  type ReminderSettingsInput,
} from "@/actions/settings.schema";
import { Button } from "@/components/common/button";
import { Card, CardTitle } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { Switch } from "@/components/common/switch";
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

export function BillingAlertForm({ settings }: { settings: StudioSettingsData }) {
  const { mutate: updateSettings, isLoading } = useMutate("updateStudioSettings", {
    invalidateKeys: ["getStudioSettings"],
  });

  return (
    <FORM<BillingAlertSettingsInput>
      schema={billingAlertSettingsSchema}
      defaultValues={{
        billingAlertEnabled: settings.billingAlertEnabled,
        parentNotificationAlertEnabled: settings.parentNotificationAlertEnabled,
        registrationAlertEnabled: settings.registrationAlertEnabled,
        paymentRecordedAlertEnabled: settings.paymentRecordedAlertEnabled,
        creditAlertEnabled: settings.creditAlertEnabled,
        billingFailureAlertEnabled: settings.billingFailureAlertEnabled,
        parentNotificationFailureAlertEnabled: settings.parentNotificationFailureAlertEnabled,
        paymentReminderFailureAlertEnabled: settings.paymentReminderFailureAlertEnabled,
        unfinalizedFeeAlertEnabled: settings.unfinalizedFeeAlertEnabled,
        billingAlertEmail: settings.billingAlertEmail ?? "",
      }}
      onSubmit={(data) => updateSettings(data)}
    >
      {(form) => (
        <Card
          header={
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4" />
              Monthly Billing Alert
            </CardTitle>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Email when monthly bills are ready</p>
                <p className="text-xs text-muted-foreground">
                  Enabled by default. This alerts staff to review and finalize class fees.
                </p>
              </div>
              <Switch
                checked={form.watch("billingAlertEnabled")}
                onCheckedChange={(checked) => form.setValue("billingAlertEnabled", checked, { shouldDirty: true })}
                aria-label="Email when monthly bills are ready"
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Email when a parent fee notice is sent</p>
                <p className="text-xs text-muted-foreground">
                  Sends staff a confirmation with the family, month, and delivery method.
                </p>
              </div>
              <Switch
                checked={form.watch("parentNotificationAlertEnabled")}
                onCheckedChange={(checked) =>
                  form.setValue("parentNotificationAlertEnabled", checked, { shouldDirty: true })
                }
                aria-label="Email when a parent fee notice is sent"
              />
            </div>
            <FormFeilds<BillingAlertSettingsInput>
              name="billingAlertEmail"
              label="Billing Alert Email"
              type="email"
              placeholder="owner@example.com"
            />
            {([
              ["registrationAlertEnabled", "New registration received"],
              ["paymentRecordedAlertEnabled", "Payment recorded"],
              ["creditAlertEnabled", "Overpayment or credit created"],
              ["billingFailureAlertEnabled", "Automatic billing failed"],
              ["parentNotificationFailureAlertEnabled", "Parent fee notification failed"],
              ["paymentReminderFailureAlertEnabled", "Payment reminder failed"],
              ["unfinalizedFeeAlertEnabled", "Class fees still need finalization"],
            ] as const).map(([name, label]) => (
              <div key={name} className="flex items-center justify-between gap-4 rounded-md border p-3">
                <p className="text-sm font-medium">{label}</p>
                <Switch
                  checked={form.watch(name)}
                  onCheckedChange={(checked) => form.setValue(name, checked, { shouldDirty: true })}
                  aria-label={label}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              If left blank, the active owner account email receives the alert. This email is for
              staff only and does not send bills to parents.
            </p>
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                {isLoading ? "Saving..." : "Save Billing Alert"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </FORM>
  );
}
