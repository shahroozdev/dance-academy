"use client";

import { Mail, MessageCircle } from "lucide-react";

import type { StudioSettingsData } from "@/actions/settings";
import {
  smtpSettingsSchema,
  whatsappSettingsSchema,
  type SmtpSettingsInput,
  type WhatsappSettingsInput,
} from "@/actions/settings.schema";
import { Button } from "@/components/common/button";
import { Card, CardTitle } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useMutate } from "@/hooks/useMutate";

export function SmtpForm({ settings }: { settings: StudioSettingsData }) {
  const { mutate: updateSettings, isLoading } = useMutate("updateStudioSettings", {
    invalidateKeys: ["getStudioSettings"],
  });

  return (
    <FORM
      schema={smtpSettingsSchema}
      defaultValues={{
        smtpHost: settings.smtpHost ?? "",
        smtpPort: settings.smtpPort ?? 587,
        smtpSecure: settings.smtpSecure,
        smtpUser: settings.smtpUser ?? "",
        smtpPassword: "",
        emailFrom: settings.emailFrom ?? "",
      }}
      onSubmit={(data) => {
        updateSettings(data);
      }}
    >
      {(form) => (
        <Card
          header={
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              Email (SMTP)
            </CardTitle>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormFeilds<SmtpSettingsInput> name="smtpHost" label="SMTP Host" type="text" placeholder="smtp.gmail.com" />
              <FormFeilds<SmtpSettingsInput> name="smtpPort" label="SMTP Port" type="number" placeholder="587" />
              <FormFeilds<SmtpSettingsInput> name="smtpUser" label="SMTP User" type="text" placeholder="you@example.com" />
              <FormFeilds<SmtpSettingsInput>
                name="smtpPassword"
                label="SMTP Password"
                type="password"
                placeholder={settings.smtpPasswordSet ? "Configured — leave blank to keep" : "Enter password"}
              />
              <FormFeilds<SmtpSettingsInput>
                name="emailFrom"
                label="From Address"
                type="text"
                placeholder="Malhaar Dance Company <no-reply@example.com>"
                className="sm:col-span-2"
              />
            </div>
            <Field orientation="horizontal">
              <Switch
                id="smtpSecure"
                checked={form.watch("smtpSecure")}
                onCheckedChange={(checked) => form.setValue("smtpSecure", checked, { shouldDirty: true })}
              />
              <FieldLabel htmlFor="smtpSecure">Use TLS (secure)</FieldLabel>
            </Field>
            <FieldDescription>
              Leave the host blank to disable email sending. Any standard SMTP provider works
              (Gmail app password, Google Workspace, SendGrid, Mailgun, Resend SMTP, etc.).
            </FieldDescription>
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                {isLoading ? "Saving..." : "Save Email Settings"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </FORM>
  );
}

export function WhatsappForm({ settings }: { settings: StudioSettingsData }) {
  const { mutate: updateSettings, isLoading } = useMutate("updateStudioSettings", {
    invalidateKeys: ["getStudioSettings"],
  });

  return (
    <FORM
      schema={whatsappSettingsSchema}
      defaultValues={{
        whatsappPhoneNumberId: settings.whatsappPhoneNumberId ?? "",
        whatsappBusinessAccountId: settings.whatsappBusinessAccountId ?? "",
        whatsappAccessToken: "",
      }}
      onSubmit={(data) => {
        updateSettings(data);
      }}
    >
      {(form) => (
        <Card
          header={
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              WhatsApp Cloud API
            </CardTitle>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormFeilds<WhatsappSettingsInput>
                name="whatsappPhoneNumberId"
                label="Phone Number ID"
                type="text"
              />
              <FormFeilds<WhatsappSettingsInput>
                name="whatsappBusinessAccountId"
                label="Business Account ID"
                type="text"
              />
              <FormFeilds<WhatsappSettingsInput>
                name="whatsappAccessToken"
                label="Access Token"
                type="password"
                placeholder={settings.whatsappAccessTokenSet ? "Configured — leave blank to keep" : "Enter access token"}
                className="sm:col-span-2"
              />
            </div>
            <FieldDescription>
              From the Meta developer console (see docs/05-notifications-whatsapp.md). Fee
              reminders currently use a wa.me link and don&apos;t require these — they&apos;re
              here for future automated sending.
            </FieldDescription>
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                {isLoading ? "Saving..." : "Save WhatsApp Settings"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </FORM>
  );
}
