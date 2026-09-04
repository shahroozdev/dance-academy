"use client";

import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { createRegistrationRequest } from "@/actions/registrations";
import {
  registrationRequestCreateSchema,
  type RegistrationRequestCreateInput,
} from "@/actions/registrations.schema";
import { Button } from "@/components/common/button";
import { Card, CardDescription, CardTitle } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
  { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" },
];

type RegisterFormProps = {
  classOptions: { label: string; value: string }[];
};

export function RegisterForm({ classOptions }: RegisterFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (submitted) {
    return (
      <Card
        className="w-full max-w-lg"
        header={
          <>
            <CardTitle>Thank you!</CardTitle>
            <CardDescription>
              Your registration request has been received. We&apos;ll be in touch shortly to confirm
              enrollment.
            </CardDescription>
          </>
        }
      />
    );
  }

  return (
    <Card
      className="w-full max-w-lg"
      header={
        <>
          <CardTitle>Malhaar Dance Company Registration</CardTitle>
          <CardDescription>Tell us about your dancer and we&apos;ll get them enrolled.</CardDescription>
        </>
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
          requestedClassId: "",
          previousDanceExperience: "",
          emergencyContactName: "",
          emergencyContactRelationship: "",
          emergencyPhone: "",
          studioPolicyAgreement: false,
          photoVideoConsent: false,
        }}
        onSubmit={async (data: RegistrationRequestCreateInput) => {
          setError(null);
          setIsSubmitting(true);
          try {
            await createRegistrationRequest(data);
            setSubmitted(true);
          } catch {
            setError("Something went wrong submitting your registration. Please try again.");
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        {(form) => (
          <div className="space-y-4 p-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Parent / Guardian</p>
              <FormFeilds name="parentGuardianName" label="Full Name" placeholder="e.g. Anu Sharma" />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds name="parentEmail" label="Email" type="email" placeholder="anu@example.com" />
                <FormFeilds name="parentPhone" label="Phone" type="tel" placeholder="e.g. (555) 123-4567" />
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium text-foreground">Student</p>
              <FormFeilds name="studentFullName" label="Student Full Name" placeholder="e.g. Nia Sharma" />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds name="dob" label="Date of Birth" type="date" />
                <FormFeilds
                  name="gender"
                  label="Gender"
                  type="select"
                  options={GENDER_OPTIONS}
                  placeholder="Select..."
                />
              </div>
              <FormFeilds
                name="requestedClassId"
                label="Requested Class"
                type="select"
                options={classOptions}
                placeholder={classOptions.length ? "Select a class..." : "No classes available yet"}
                disabled={classOptions.length === 0}
              />
              <FormFeilds
                name="previousDanceExperience"
                label="Previous Dance Experience"
                type="textarea"
                placeholder="Optional — tell us about any prior training"
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium text-foreground">Emergency Contact</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds name="emergencyContactName" label="Contact Name" placeholder="e.g. Priya Sharma" />
                <FormFeilds
                  name="emergencyContactRelationship"
                  label="Relationship"
                  placeholder="e.g. Grandmother"
                />
              </div>
              <FormFeilds name="emergencyPhone" label="Emergency Phone" type="tel" placeholder="e.g. (555) 123-4567" />
            </div>

            <div className="space-y-3 border-t pt-4">
              <ConsentField
                name="studioPolicyAgreement"
                label="I agree to the studio's policies and procedures."
              />
              <ConsentField
                name="photoVideoConsent"
                label="I consent to my child being photographed/recorded for studio use (e.g. social media, promotional materials)."
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting || !form.formState.isValid}>
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
}: {
  name: "studioPolicyAgreement" | "photoVideoConsent";
  label: string;
}) {
  const { control } = useFormContext<RegistrationRequestCreateInput>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.error ? "true" : undefined}>
          <FieldLabel htmlFor={name} className="flex-row items-start gap-2 font-normal">
            <input
              id={name}
              type="checkbox"
              checked={Boolean(field.value)}
              onChange={(event) => field.onChange(event.target.checked)}
              onBlur={field.onBlur}
              className="mt-0.5 size-4 shrink-0 rounded border-input"
            />
            <span className="text-sm">{label}</span>
          </FieldLabel>
          <FieldError errors={fieldState.error ? [fieldState.error] : []} />
        </Field>
      )}
    />
  );
}
