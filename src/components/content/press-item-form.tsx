"use client";

import { pressItemSchema, type PressItemInput } from "@/actions/content.schema";
import { FORM, FormFeilds } from "@/components/common/form";
import { FormFooter, FormSection } from "@/components/content/editor-parts";
import { MediaField } from "@/components/content/media-field";
import type { QueryData } from "@/hooks/query-registry";
import { useQuery } from "@/hooks/useQuery";
import { toDateInput } from "@/lib/content-format";
import { PRESS_KIND_LABELS } from "@/lib/content-mappers";

const KIND_OPTIONS = Object.entries(PRESS_KIND_LABELS).map(([value, label]) => ({ value, label }));

export const EMPTY_PRESS_ITEM: PressItemInput = {
  title: "",
  outlet: "",
  kind: "COVERAGE",
  publishedOn: "",
  excerpt: "",
  externalUrl: "",
  imageId: "",
  documentId: "",
};

export const toPressItemFormValues = (item: QueryData<"getContentPressItemById">): PressItemInput => ({
  title: item.title,
  outlet: item.outlet ?? "",
  kind: item.kind,
  publishedOn: toDateInput(item.publishedOn),
  excerpt: item.excerpt ?? "",
  externalUrl: item.externalUrl ?? "",
  imageId: item.imageId ?? "",
  documentId: item.documentId ?? "",
});

type PressItemFormProps = {
  defaultValues: PressItemInput;
  onSubmit: (values: PressItemInput) => Promise<unknown>;
  isSaving: boolean;
  error?: unknown;
  submitLabel: string;
  disabled?: boolean;
};

export function PressItemForm({ defaultValues, onSubmit, isSaving, error, submitLabel, disabled = false }: PressItemFormProps) {
  const { data: assets } = useQuery("getContentMediaAssets", [{}]);

  return (
    <FORM
      schema={pressItemSchema}
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
        <FormSection title="Press item">
          <FormFeilds<PressItemInput> name="title" label="Headline or title" required />
          <div className="grid gap-4 sm:grid-cols-3">
            <FormFeilds<PressItemInput> name="outlet" label="Publication or outlet" placeholder="Optional" />
            <FormFeilds<PressItemInput> name="kind" label="Type" type="select" options={KIND_OPTIONS} />
            <FormFeilds<PressItemInput> name="publishedOn" label="Date published" type="date" />
          </div>
          <FormFeilds<PressItemInput> name="excerpt" label="Short excerpt" type="textarea" placeholder="Optional" />
        </FormSection>

        <FormSection
          title="What visitors open"
          description="Add a link to the article or video, attach a PDF from the Media Library, or both."
        >
          <FormFeilds<PressItemInput> name="externalUrl" label="Link" placeholder="https://" />
          <div className="grid gap-4 sm:grid-cols-2">
            <MediaField<PressItemInput> name="documentId" label="Attached PDF" kind="DOCUMENT" assets={assets} />
            <MediaField<PressItemInput> name="imageId" label="Feature image" assets={assets} />
          </div>
        </FormSection>

        <FormFooter error={error} cancelHref="/content/press" isSaving={isSaving} submitLabel={submitLabel} disabled={disabled} />
      </fieldset>
    </FORM>
  );
}
