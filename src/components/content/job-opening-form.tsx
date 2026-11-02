"use client";

import { jobOpeningSchema, type JobOpeningInput } from "@/actions/content.schema";
import { FORM, FormFeilds } from "@/components/common/form";
import { FormFooter, FormSection } from "@/components/content/editor-parts";
import type { QueryData } from "@/hooks/query-registry";

export const EMPTY_JOB_OPENING: JobOpeningInput = {
  title: "",
  location: "",
  employmentType: "",
  description: "",
  applyUrl: "",
};

export const toJobOpeningFormValues = (job: QueryData<"getContentJobOpeningById">): JobOpeningInput => ({
  title: job.title,
  location: job.location ?? "",
  employmentType: job.employmentType ?? "",
  description: job.description,
  applyUrl: job.applyUrl ?? "",
});

type JobOpeningFormProps = {
  defaultValues: JobOpeningInput;
  onSubmit: (values: JobOpeningInput) => Promise<unknown>;
  isSaving: boolean;
  error?: unknown;
  submitLabel: string;
  disabled?: boolean;
};

export function JobOpeningForm({ defaultValues, onSubmit, isSaving, error, submitLabel, disabled = false }: JobOpeningFormProps) {
  return (
    <FORM
      schema={jobOpeningSchema}
      defaultValues={defaultValues}
      onSubmit={async (values) => {
        try {
          await onSubmit(values);
        } catch {
          /* The error is shown in the footer. */
        }
      }}
    >
      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-8 p-4">
        <FormSection title="Position">
          <FormFeilds<JobOpeningInput> name="title" label="Position title" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormFeilds<JobOpeningInput> name="location" label="Location" placeholder="Optional, e.g. Wood Dale" />
            <FormFeilds<JobOpeningInput> name="employmentType" label="Type" placeholder="Optional, e.g. Part-time" />
          </div>
          <FormFeilds<JobOpeningInput> name="description" label="Description" type="textarea" required />
        </FormSection>

        <FormSection
          title="How to apply"
          description="Leave this empty and the Apply button opens the website's contact form, so applications arrive in Inquiries."
        >
          <FormFeilds<JobOpeningInput> name="applyUrl" label="Application link" placeholder="https://" />
        </FormSection>

        <FormFooter error={error} cancelHref="/content/jobs" isSaving={isSaving} submitLabel={submitLabel} disabled={disabled} />
      </fieldset>
    </FORM>
  );
}
