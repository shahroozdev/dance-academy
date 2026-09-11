"use client";

import { Eye, Info, ListChecks, RotateCcw, Save, ScrollText } from "lucide-react";

import type { StudioSettingsData } from "@/actions/settings";
import {
  registrationPolicySettingsSchema,
  type RegistrationPolicySettingsInput,
} from "@/actions/settings.schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/common/alert";
import { Button } from "@/components/common/button";
import { Card, CardTitle } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { RegistrationPolicyContent } from "@/components/common/registration-policy-content";
import { useMutate } from "@/hooks/useMutate";
import {
  DEFAULT_REGISTRATION_AGREEMENT_LABEL,
  DEFAULT_REGISTRATION_POLICY_CONTENT,
  DEFAULT_REGISTRATION_POLICY_TITLE,
} from "@/lib/registration-policy";

export function RegistrationPolicyForm({ settings }: { settings: StudioSettingsData }) {
  const { mutate: updatePolicy, isLoading } = useMutate("updateRegistrationPolicy", {
    invalidateKeys: ["getStudioSettings"],
  });

  return (
    <FORM<RegistrationPolicySettingsInput>
      schema={registrationPolicySettingsSchema}
      defaultValues={{
        registrationPolicyTitle: settings.registrationPolicyTitle,
        registrationPolicyContent: settings.registrationPolicyContent,
        registrationPolicyAgreementLabel: settings.registrationPolicyAgreementLabel,
      }}
      onSubmit={(data) => updatePolicy(data)}
    >
      {(form) => {
        const preview = form.watch();
        return (
          <div className="space-y-6">
            <Alert className="border-primary/20 bg-primary/5 p-4">
              <Info className="size-5 text-primary" />
              <AlertTitle>How registration policies work</AlertTitle>
              <AlertDescription className="mt-1 max-w-4xl text-pretty">
                This is the guide parents read before agreeing on the public registration form.
                Saving publishes a new version for future registrations only; previous registrations
                keep the exact wording that parent accepted.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3 sm:grid-cols-3">
              <GuideStep
                number="1"
                title="Edit the guide"
                description="Update the title, policy sections, or agreement wording below."
              />
              <GuideStep
                number="2"
                title="Check the preview"
                description="Confirm exactly how headings, text, and the agreement will appear."
              />
              <GuideStep
                number="3"
                title="Save and publish"
                description="Saving makes the new version available to future registrations."
              />
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-2">
              <Card
                header={
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ScrollText className="size-4 text-primary" />
                      Edit Registration Policy
                    </CardTitle>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      Current version {settings.registrationPolicyVersion}
                    </span>
                  </div>
                }
                headerClassName="border-b"
              >
                <div className="space-y-5 pt-2">
                <FormFeilds<RegistrationPolicySettingsInput>
                  name="registrationPolicyTitle"
                  label="Policy Title"
                  required
                />
                <div className="space-y-2">
                  <FormFeilds<RegistrationPolicySettingsInput>
                    name="registrationPolicyContent"
                    label="Policy Content"
                    type="textarea"
                    className="min-h-[30rem] font-mono text-sm leading-6"
                    required
                  />
                  <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                    <p className="flex items-center gap-1.5 font-medium text-foreground">
                      <ListChecks className="size-3.5 text-primary" />
                      Formatting guide
                    </p>
                    <p className="mt-1">
                      Put a heading on its own line, followed by its details. Leave one blank line
                      before the next heading. For lists, start each item on a new line with •.
                    </p>
                  </div>
                </div>
                <FormFeilds<RegistrationPolicySettingsInput>
                  name="registrationPolicyAgreementLabel"
                  label="Required Agreement Wording"
                  type="textarea"
                  className="min-h-20"
                  required
                />
                <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-between gap-3 border-t bg-card/95 px-6 pt-4 pb-1 backdrop-blur">
                  <p className="text-xs text-muted-foreground">
                    Restore only fills the editor; click Save Policy to publish it.
                  </p>
                  <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset({
                      registrationPolicyTitle: DEFAULT_REGISTRATION_POLICY_TITLE,
                      registrationPolicyContent: DEFAULT_REGISTRATION_POLICY_CONTENT,
                      registrationPolicyAgreementLabel: DEFAULT_REGISTRATION_AGREEMENT_LABEL,
                    })}
                  >
                    <RotateCcw className="size-4" />
                    Restore PDF Defaults
                  </Button>
                  <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                    <Save className="size-4" />
                    {isLoading ? "Saving..." : "Save Policy"}
                  </Button>
                  </div>
                </div>
              </div>
              </Card>

              <Card
                header={
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Eye className="size-4 text-primary" />
                      Parent Preview
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      This preview updates while you type. Unsaved changes are not visible to parents.
                    </p>
                  </div>
                }
                headerClassName="border-b"
                contentClassName="max-h-[52rem] overflow-y-auto bg-muted/20 pt-4"
              >
                <RegistrationPolicyContent
                  title={preview.registrationPolicyTitle || "Policy title"}
                  content={preview.registrationPolicyContent || "Policy content"}
                  version={settings.registrationPolicyVersion + (form.formState.isDirty ? 1 : 0)}
                />
                <div className="mt-5 rounded-lg border bg-primary/5 p-4 text-sm">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Required agreement
                  </p>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 size-4 shrink-0 rounded border border-input bg-background" />
                    <span>{preview.registrationPolicyAgreementLabel || "Agreement wording"}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );
      }}
    </FORM>
  );
}

function GuideStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-3 rounded-xl border bg-card p-4 shadow-xs">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {number}
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
