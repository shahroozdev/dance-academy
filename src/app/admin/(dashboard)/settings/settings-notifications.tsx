"use client";

import { BellRing, Info } from "lucide-react";

import type { StudioSettingsData } from "@/actions/settings";
import {
  billingAlertSettingsSchema,
  type BillingAlertSettingsInput,
} from "@/actions/settings.schema";
import { Button } from "@/components/common/button";
import { Card, CardTitle } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { Switch } from "@/components/common/switch";
import TooltipWrapper from "@/components/common/TooltipWrapper";
import { useMutate } from "@/hooks/useMutate";

const ALERT_GROUPS = [
  {
    title: "Registration Alerts",
    alerts: [["registrationAlertEnabled", "New registration received", "Emails staff when a parent submits a new registration so it can be reviewed. Turning this off does not stop registration acknowledgement emails sent to parents."]],
  },
  {
    title: "Billing & Payment Alerts",
    alerts: [
      ["billingAlertEnabled", "Monthly bills are ready", "Emails staff after the automatic monthly billing run, including created, updated, and skipped bill counts."],
      ["paymentRecordedAlertEnabled", "Payment recorded", "Emails staff whenever a payment is recorded against a student's bill, including the family and payment details."],
      ["creditAlertEnabled", "Overpayment or credit created", "Emails staff when a payment creates an overpayment or credit that may need review or refund handling."],
      ["unfinalizedFeeAlertEnabled", "Class fees still need finalization", "Reminds staff when class session counts or monthly fees are still awaiting finalization before parent notices can be sent."],
    ],
  },
  {
    title: "Parent Communication Alerts",
    alerts: [
      ["parentNotificationAlertEnabled", "Parent fee notice sent", "Emails staff a confirmation after a family fee notice is successfully emailed, accepted by WhatsApp, or manually marked as sent."],
      ["parentNotificationFailureAlertEnabled", "Parent fee notification failed", "Emails staff when a parent fee notice cannot be delivered so the family can be contacted another way."],
      ["paymentReminderFailureAlertEnabled", "Payment reminder failed", "Emails staff when an automatic payment reminder cannot be delivered to a family."],
    ],
  },
  {
    title: "System Alerts",
    alerts: [["billingFailureAlertEnabled", "Automatic billing failed", "Emails staff when the scheduled monthly billing process fails and needs attention."]],
  },
] as const satisfies ReadonlyArray<{
  title: string;
  alerts: ReadonlyArray<readonly [keyof BillingAlertSettingsInput, string, string]>;
}>;

export function NotificationSettingsForm({ settings }: { settings: StudioSettingsData }) {
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
              Staff Notifications
            </CardTitle>
          }
        >
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <FormFeilds<BillingAlertSettingsInput>
                name="billingAlertEmail"
                label="Staff Alert Email"
                type="email"
                placeholder="owner@example.com"
              />
              <p className="text-xs text-muted-foreground">
                If left blank, alerts go to the active owner account email. This address is for
                staff alerts only and is never used to send bills to parents.
              </p>
            </div>

            {ALERT_GROUPS.map((group) => (
              <section key={group.title} className="space-y-3">
                <h3 className="text-sm font-semibold">{group.title}</h3>
                <div className="space-y-3">
                  {group.alerts.map(([name, label, description]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between gap-4 rounded-md border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="text-sm font-medium">{label}</p>
                        <TooltipWrapper label={description}>
                          <button
                            type="button"
                            aria-label={`About ${label}`}
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            <Info className="size-4" />
                          </button>
                        </TooltipWrapper>
                      </div>
                      <Switch
                        checked={Boolean(form.watch(name))}
                        onCheckedChange={(checked) =>
                          form.setValue(name, checked, { shouldDirty: true })
                        }
                        aria-label={label}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <div className="sticky bottom-2 z-10 flex justify-end rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                {isLoading ? "Saving..." : "Save Notification Settings"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </FORM>
  );
}
