"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { Button } from "@/components/common/button";
import { FormFeilds } from "@/components/common/form";
import { MediaField, type LibraryAsset } from "@/components/content/media-field";

type RowControlsProps = {
  index: number;
  count: number;
  label: string;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
};

/** Reorder and remove buttons for one row of a repeating list. */
export function RowControls({ index, count, label, onMove, onRemove }: RowControlsProps) {
  return (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Move ${label} earlier`}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        <ArrowUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Move ${label} later`}
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <ArrowDown />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${label}`} onClick={() => onRemove(index)}>
        <Trash2 className="text-destructive" />
      </Button>
    </div>
  );
}

const ROLE_OPTIONS = [
  { label: "Poster or artwork", value: "POSTER" },
  { label: "Photo gallery", value: "GALLERY" },
  { label: "Video", value: "VIDEO" },
  { label: "Sponsor logo", value: "SPONSOR" },
];

type MediaRow = { assetId: string; caption: string; role?: string; linkUrl?: string };
type MediaRowsForm = { media: MediaRow[] };

type MediaRowsFieldsProps = {
  assets: LibraryAsset[] | undefined;
  /** Festivals place each file in a part of the page; a performance gallery is photos only. */
  withRoles?: boolean;
};

/** The repeating "media" list of a festival or performance form, in display order. */
export function MediaRowsFields({ assets, withRoles = false }: MediaRowsFieldsProps) {
  const { control } = useFormContext<MediaRowsForm>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "media" });
  const rows = useWatch({ control, name: "media" });

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-col gap-3 rounded-md border p-3">
          <RowControls index={index} count={fields.length} label={`item ${index + 1}`} onMove={move} onRemove={remove} />
          <div className="grid gap-4 sm:grid-cols-2">
            <MediaField<MediaRowsForm>
              name={`media.${index}.assetId`}
              label="File"
              kind={rows?.[index]?.role === "VIDEO" ? "VIDEO" : "IMAGE"}
              assets={assets}
            />
            <div className="flex flex-col gap-4">
              {withRoles && (
                <FormFeilds<MediaRowsForm> name={`media.${index}.role`} label="Shown as" type="select" options={ROLE_OPTIONS} />
              )}
              <FormFeilds<MediaRowsForm>
                name={`media.${index}.caption`}
                label={withRoles ? "Caption or sponsor name" : "Caption"}
                placeholder="Optional"
              />
              {withRoles && (
                <FormFeilds<MediaRowsForm>
                  name={`media.${index}.linkUrl`}
                  label="Link (sponsor website)"
                  placeholder="https://"
                />
              )}
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => append({ assetId: "", caption: "", ...(withRoles && { role: "POSTER", linkUrl: "" }) })}
      >
        <Plus />
        Add a file
      </Button>
    </div>
  );
}
