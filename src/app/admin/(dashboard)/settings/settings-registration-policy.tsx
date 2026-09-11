"use client";

import { RotateCcw, ScrollText } from "lucide-react";

import type { StudioSettingsData } from "@/actions/settings";
import {
  registrationPolicySettingsSchema,
  type RegistrationPolicySettingsInput,
} from "@/actions/settings.schema";
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
          <div className="grid gap-6 xl:grid-cols-2">
            <Card
              header={
                <CardTitle className="flex items-center gap-2 text-base">
                  <ScrollText className="size-4" />
                  Registration Policy Editor
                </CardTitle>
              }
            >
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Parents see this guide before the required agreement. Separate each heading and
                  its text with a blank line. Saving creates a new policy version for future registrations.
                </p>
                <FormFeilds<RegistrationPolicySettingsInput>
                  name="registrationPolicyTitle"
                  label="Policy Title"
                  required
                />
                <FormFeilds<RegistrationPolicySettingsInput>
                  name="registrationPolicyContent"
                  label="Policy Content"
                  type="textarea"
                  className="min-h-[30rem]"
                  required
                />
                <FormFeilds<RegistrationPolicySettingsInput>
                  name="registrationPolicyAgreementLabel"
                  label="Required Agreement Wording"
                  type="textarea"
                  className="min-h-20"
                  required
                />
                <div className="flex flex-wrap justify-end gap-2">
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
                    {isLoading ? "Saving..." : "Save Policy"}
                  </Button>
                </div>
              </div>
            </Card>

            <Card
              header={<CardTitle className="text-base">Parent Preview</CardTitle>}
              contentClassName="max-h-[48rem] overflow-y-auto"
            >
              <RegistrationPolicyContent
                title={preview.registrationPolicyTitle || "Policy title"}
                content={preview.registrationPolicyContent || "Policy content"}
                version={settings.registrationPolicyVersion + (form.formState.isDirty ? 1 : 0)}
              />
              <div className="mt-5 rounded-md border bg-muted/30 p-3 text-sm">
                <span className="mr-2 inline-block size-4 rounded border border-input align-text-bottom" />
                {preview.registrationPolicyAgreementLabel || "Agreement wording"}
              </div>
            </Card>
          </div>
        );
      }}
    </FORM>
  );
}
