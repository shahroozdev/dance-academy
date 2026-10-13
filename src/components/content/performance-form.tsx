"use client";

import { performanceSchema, type PerformanceInput } from "@/actions/content.schema";
import { FORM, FormFeilds } from "@/components/common/form";
import { FormFooter, FormSection } from "@/components/content/editor-parts";
import { MediaField } from "@/components/content/media-field";
import { MediaRowsFields } from "@/components/content/media-rows-fields";
import type { QueryData } from "@/hooks/query-registry";
import { useQuery } from "@/hooks/useQuery";
import { toDateInput } from "@/lib/content-format";

export const EMPTY_PERFORMANCE: PerformanceInput = {
  title: "",
  slug: "",
  eventDate: "",
  venue: "",
  summary: "",
  description: "",
  coverId: "",
  videoUrl: "",
  externalUrl: "",
  media: [],
};

export const toPerformanceFormValues = (performance: QueryData<"getContentPerformanceById">): PerformanceInput => ({
  title: performance.title,
  slug: performance.slug,
  eventDate: toDateInput(performance.eventDate),
  venue: performance.venue ?? "",
  summary: performance.summary,
  description: performance.description ?? "",
  coverId: performance.coverId ?? "",
  videoUrl: performance.videoUrl ?? "",
  externalUrl: performance.externalUrl ?? "",
  media: performance.media.map((item) => ({ assetId: item.assetId, caption: item.caption ?? "" })),
});

type PerformanceFormProps = {
  defaultValues: PerformanceInput;
  onSubmit: (values: PerformanceInput) => Promise<unknown>;
  isSaving: boolean;
  error?: unknown;
  submitLabel: string;
  disabled?: boolean;
};

export function PerformanceForm({ defaultValues, onSubmit, isSaving, error, submitLabel, disabled = false }: PerformanceFormProps) {
  const { data: assets } = useQuery("getContentMediaAssets", [{}]);

  return (
    <FORM
      schema={performanceSchema}
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
        <FormSection title="Performance">
          <FormFeilds<PerformanceInput> name="title" label="Title" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormFeilds<PerformanceInput> name="eventDate" label="Date" type="date" />
            <FormFeilds<PerformanceInput> name="venue" label="Venue" placeholder="Optional" />
          </div>
          <FormFeilds<PerformanceInput>
            name="summary"
            label="Summary"
            type="textarea"
            placeholder="One or two sentences shown on the Performances page."
            required
          />
          <FormFeilds<PerformanceInput>
            name="description"
            label="Full description"
            type="textarea"
            placeholder="Optional. Leave a blank line between paragraphs."
          />
          <FormFeilds<PerformanceInput>
            name="slug"
            label="Page address"
            placeholder="Leave empty to make one from the title, e.g. spring-showcase-2027"
          />
        </FormSection>

        <FormSection
          title="Cover and links"
          description="A performance with a cover image is shown as a card on the Performances page. Without one, only its gallery photos appear there."
        >
          <MediaField<PerformanceInput> name="coverId" label="Cover image" assets={assets} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormFeilds<PerformanceInput> name="videoUrl" label="Video link" placeholder="https://" />
            <FormFeilds<PerformanceInput> name="externalUrl" label="Related link" placeholder="https://" />
          </div>
        </FormSection>

        <FormSection title="Gallery" description="Photos shown on the performance's own page, in this order.">
          <MediaRowsFields assets={assets} />
        </FormSection>

        <FormFooter
          error={error}
          cancelHref="/content/performances"
          isSaving={isSaving}
          submitLabel={submitLabel}
          disabled={disabled}
        />
      </fieldset>
    </FORM>
  );
}
