"use client";

import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import {
  registrationRequestCreateSchema,
  type RegistrationRequestCreateInput,
} from "@/actions/registrations.schema";
import type { PublicRegistrationPolicy } from "@/actions/settings";
import { Button } from "@/components/common/button";
import { Card, CardDescription, CardTitle } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { RegistrationPolicyContent } from "@/components/common/registration-policy-content";
import { Logo } from "@/components/layout/logo";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useMutate } from "@/hooks/useMutate";
import { todayIsoDate } from "@/lib/utils";

const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
  { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" },
];

type RegisterFormProps = {
  programOptions: { label: string; value: string }[];
  policy: PublicRegistrationPolicy;
};

export function RegisterForm({ programOptions, policy }: RegisterFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate: submitRegistration, isLoading: isSubmitting } = useMutate("createRegistrationRequest");

  if (submitted) {
    return (
      <Card
        className="w-full max-w-2xl"
        contentClassName="flex flex-col items-center gap-5 py-10 text-center"
      >
        <div className="relative">
          <Logo size={64} />
          <CheckCircle2
            className="absolute -right-1.5 -bottom-1.5 size-6 rounded-full bg-background text-primary"
            strokeWidth={2.5}
          />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-xl">
            Thank you for registering!
          </CardTitle>
          <CardDescription className="mx-auto text-base max-w-md text-balance">
            We&apos;ve received your registration request for Malhaar Dance
            Company. Our team will review the details and reach out to you by
            email or phone within 1&ndash;2 business days to confirm
            enrollment and next steps.
          </CardDescription>
        </div>
        <p className="text-sm text-muted-foreground">
          Didn&apos;t hear from us? Feel free to reach out to the studio
          directly.
        </p>
      </Card>
    );
  }

  return (
    <Card
      className="w-full max-w-5xl"
      header={
        <div className="flex  gap-3 items-center">
          <Logo size={56} />
          <div>
            <CardTitle>Malhaar Dance Company Registration</CardTitle>
            <CardDescription>
              Tell us about your dancer and we&apos;ll get them enrolled.
            </CardDescription>
          </div>
        </div>
      }
    >
      <FORM
        schema={registrationRequestCreateSchema}
        defaultValues={{
          parentGuardianName: "",
          parentEmail: "",
          parentPhone: "",
          studentFullName: "",
          dob: "",
          gender: undefined,
          requestedProgramId: "",
          previousDanceExperience: "",
          emergencyContactName: "",
          emergencyContactRelationship: "",
          emergencyPhone: "",
          studioPolicyAgreement: false,
          photoVideoConsent: false,
        }}
        onSubmit={async (data: RegistrationRequestCreateInput) => {
          setError(null);
          try {
            await submitRegistration(data);
            setSubmitted(true);
          } catch {
            setError(
              "Something went wrong submitting your registration. Please try again.",
            );
          }
        }}
      >
        {() => (
          <div className="space-y-4 p-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                Parent / Guardian
              </p>
              <FormFeilds
                name="parentGuardianName"
                label="Full Name"
                placeholder="e.g. Anu Sharma"
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds
                  name="parentEmail"
                  label="Email"
                  type="email"
                  placeholder="anu@example.com"
                />
                <FormFeilds
                  name="parentPhone"
                  label="Phone"
                  type="tel"
                  required
                />
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium text-foreground">Student</p>
              <FormFeilds
                name="studentFullName"
                label="Student Full Name"
                placeholder="e.g. Nia Sharma"
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds name="dob" label="Date of Birth" type="date" max={todayIsoDate()} />
                <FormFeilds
                  name="gender"
                  label="Gender"
                  type="select"
                  options={GENDER_OPTIONS}
                  placeholder="Select..."
                />
              </div>
              <FormFeilds
                name="requestedProgramId"
                label="Dance Style / Program"
                type="select"
                options={programOptions}
                placeholder={
                  programOptions.length
                    ? "Select a program..."
                    : "No programs available yet"
                }
                disabled={programOptions.length === 0}
                required
              />
              <FormFeilds
                name="previousDanceExperience"
                label="Previous Dance Experience"
                type="textarea"
                placeholder="Optional — tell us about any prior training"
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium text-foreground">
                Emergency Contact
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds
                  name="emergencyContactName"
                  label="Contact Name"
                  placeholder="e.g. Priya Sharma"
                  required
                />
                <FormFeilds
                  name="emergencyContactRelationship"
                  label="Relationship"
                  placeholder="e.g. Grandmother"
                  required
                />
              </div>
              <FormFeilds
                name="emergencyPhone"
                label="Emergency Phone"
                type="tel"
                required
              />
            </div>

            <div className="space-y-4 border-t pt-5">
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">Review &amp; Consent</p>
                <p className="text-sm text-muted-foreground">
                  Please review the class guide, then confirm your choices to complete registration.
                </p>
              </div>
              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
                <div className="relative overflow-hidden rounded-xl border bg-muted/20 shadow-sm">
                  <div className="max-h-[34rem] overflow-y-auto p-4 pr-3 sm:p-5 sm:pr-4">
                    <RegistrationPolicyContent
                      title={policy.registrationPolicyTitle}
                      content={policy.registrationPolicyContent}
                      version={policy.registrationPolicyVersion}
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-background/90 to-transparent" />
                </div>
                <div className="space-y-5 rounded-xl border bg-primary/5 p-4 shadow-sm lg:sticky lg:top-4">
                  <div className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <ShieldCheck className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-medium text-foreground">Your consent</p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        The studio-policy agreement is required. Media consent is optional.
                      </p>
                    </div>
                  </div>
                <ConsentField
                  name="studioPolicyAgreement"
                  label={policy.registrationPolicyAgreementLabel}
                  required
                />
                <ConsentField
                  name="photoVideoConsent"
                  label="I consent to my child being photographed/recorded for studio use (e.g. social media, promotional materials)."
                />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Registration"}
            </Button>
          </div>
        )}
      </FORM>
    </Card>
  );
}

function ConsentField({
  name,
  label,
  required = false,
}: {
  name: "studioPolicyAgreement" | "photoVideoConsent";
  label: string;
  required?: boolean;
}) {
  const { control } = useFormContext<RegistrationRequestCreateInput>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          data-invalid={fieldState.error ? "true" : undefined}
          className="rounded-lg border bg-background p-3"
        >
          <FieldLabel
            htmlFor={name}
            className="flex-row items-start gap-2 font-normal"
          >
            <input
              id={name}
              type="checkbox"
              checked={Boolean(field.value)}
              onChange={(event) => field.onChange(event.target.checked)}
              onBlur={field.onBlur}
              className="mt-0.5 size-4 shrink-0 rounded border-input"
            />
            <span className="text-sm leading-5">
              {label}
              {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
            </span>
          </FieldLabel>
          <FieldError errors={fieldState.error ? [fieldState.error] : []} />
        </Field>
      )}
    />
  );
}
