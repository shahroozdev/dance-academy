"use client";

import { Plus } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { festivalSchema, type FestivalInput } from "@/actions/content.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { FormFooter, FormSection } from "@/components/content/editor-parts";
import { MediaField, type LibraryAsset } from "@/components/content/media-field";
import { MediaRowsFields, RowControls } from "@/components/content/media-rows-fields";
import type { QueryData } from "@/hooks/query-registry";
import { useQuery } from "@/hooks/useQuery";
import { toDateInput } from "@/lib/content-format";

export const EMPTY_FESTIVAL: FestivalInput = {
  year: "",
  label: "",
  eventDate: "",
  startTime: "",
  venueName: "",
  venueTown: "",
  venueRegion: "IL",
  venueStreet: "",
  venuePostalCode: "",
  summary: "",
  ticketUrl: "",
  artists: [],
  media: [],
};

export const toFestivalFormValues = (festival: QueryData<"getContentFestivalById">): FestivalInput => ({
  year: festival.year,
  label: festival.label,
  eventDate: toDateInput(festival.eventDate),
  startTime: festival.startTime,
  venueName: festival.venueName,
  venueTown: festival.venueTown,
  venueRegion: festival.venueRegion,
  venueStreet: festival.venueStreet ?? "",
  venuePostalCode: festival.venuePostalCode ?? "",
  summary: festival.summary,
  ticketUrl: festival.ticketUrl ?? "",
  artists: festival.artists.map((artist) => ({
    name: artist.name,
    artForm: artist.artForm,
    biography: artist.biography ?? "",
    photoId: artist.photoId ?? "",
  })),
  media: festival.media.map((item) => ({
    assetId: item.assetId,
    role: item.role,
    caption: item.caption ?? "",
    linkUrl: item.linkUrl ?? "",
  })),
});

function ArtistsFields({ assets }: { assets: LibraryAsset[] | undefined }) {
  const { control } = useFormContext<FestivalInput>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "artists" });

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-col gap-3 rounded-md border p-3">
          <RowControls index={index} count={fields.length} label={`artist ${index + 1}`} onMove={move} onRemove={remove} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormFeilds<FestivalInput> name={`artists.${index}.name`} label="Artist name" required />
            <FormFeilds<FestivalInput> name={`artists.${index}.artForm`} label="Art form" placeholder="e.g. Kuchipudi" required />
          </div>
          <FormFeilds<FestivalInput>
            name={`artists.${index}.biography`}
            label="Biography"
            type="textarea"
            placeholder="Optional"
          />
          <MediaField<FestivalInput> name={`artists.${index}.photoId`} label="Photo" assets={assets} />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => append({ name: "", artForm: "", biography: "", photoId: "" })}
      >
        <Plus />
        Add an artist
      </Button>
    </div>
  );
}

type FestivalFormProps = {
  defaultValues: FestivalInput;
  onSubmit: (values: FestivalInput) => Promise<unknown>;
  isSaving: boolean;
  error?: unknown;
  submitLabel: string;
  /** Read-only, for someone who may view this edition but not change it. */
  disabled?: boolean;
};

export function FestivalForm({ defaultValues, onSubmit, isSaving, error, submitLabel, disabled = false }: FestivalFormProps) {
  const { data: assets } = useQuery("getContentMediaAssets", [{}]);

  return (
    <FORM
      schema={festivalSchema}
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
        <FormSection title="Edition">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormFeilds<FestivalInput> name="year" label="Year" placeholder="2027" required />
            <FormFeilds<FestivalInput> name="label" label="Edition label" placeholder="e.g. Second edition" required />
            <FormFeilds<FestivalInput> name="eventDate" label="Date" type="date" required />
            <FormFeilds<FestivalInput> name="startTime" label="Start time (US Central)" type="time" required />
          </div>
          <FormFeilds<FestivalInput> name="summary" label="Summary" type="textarea" required />
          <FormFeilds<FestivalInput> name="ticketUrl" label="Ticket link" placeholder="https://" />
        </FormSection>

        <FormSection title="Venue" description="The street address and ZIP code help search engines list the event.">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormFeilds<FestivalInput> name="venueName" label="Venue name" required />
            <FormFeilds<FestivalInput> name="venueStreet" label="Street address" placeholder="Optional" />
            <FormFeilds<FestivalInput> name="venueTown" label="Town" required />
            <div className="grid grid-cols-2 gap-4">
              <FormFeilds<FestivalInput> name="venueRegion" label="State" required />
              <FormFeilds<FestivalInput> name="venuePostalCode" label="ZIP code" placeholder="Optional" />
            </div>
          </div>
        </FormSection>

        <FormSection title="Artists" description="Shown in this order on the festival page.">
          <ArtistsFields assets={assets} />
        </FormSection>

        <FormSection
          title="Posters, photos, videos, and sponsors"
          description="Choose files from the Media Library and say where each one appears."
        >
          <MediaRowsFields assets={assets} withRoles />
        </FormSection>

        <FormFooter
          error={error}
          cancelHref="/content/festivals"
          isSaving={isSaving}
          submitLabel={submitLabel}
          disabled={disabled}
        />
      </fieldset>
    </FORM>
  );
}
