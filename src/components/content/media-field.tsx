"use client";

import { FileText, ImageOff, Video } from "lucide-react";
import Image from "next/image";
import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form";

import { Button } from "@/components/common/button";
import { Field, FieldError, FieldLabel } from "@/components/common/field";
import { Modal } from "@/components/common/modal";
import type { QueryData } from "@/hooks/query-registry";
import { focalPosition } from "@/lib/content-format";
import { cn } from "@/lib/utils";
import type { MediaAssetKind } from "@/types/content";

export type LibraryAsset = QueryData<"getContentMediaAssets">[number];

const KIND_NOUNS: Record<MediaAssetKind, string> = { IMAGE: "image", VIDEO: "video", DOCUMENT: "document" };
const KIND_ICONS = { VIDEO: Video, DOCUMENT: FileText } as const;

/** A library file shown small: the picture itself for images, an icon for videos and documents. */
export function AssetThumb({ asset, className }: { asset: LibraryAsset; className?: string }) {
  if (asset.kind === "IMAGE") {
    return (
      <div className={cn("relative aspect-square overflow-hidden rounded-md bg-muted", className)}>
        <Image
          src={asset.url}
          alt={asset.altText || asset.title}
          fill
          sizes="12rem"
          className="object-cover"
          style={{ objectPosition: focalPosition(asset.focalX, asset.focalY) }}
        />
      </div>
    );
  }
  const Icon = KIND_ICONS[asset.kind];
  return (
    <div className={cn("flex aspect-square items-center justify-center rounded-md bg-muted text-muted-foreground", className)}>
      <Icon className="size-8" />
    </div>
  );
}

type MediaPickerProps = {
  kind: MediaAssetKind;
  value: string;
  assets: LibraryAsset[] | undefined;
  disabled?: boolean;
  onChange: (assetId: string) => void;
};

/** Shows the chosen library file and opens the library to choose another. */
export function MediaPicker({ kind, value, assets, disabled, onChange }: MediaPickerProps) {
  const noun = KIND_NOUNS[kind];
  const selected = assets?.find((asset) => asset.id === value);
  const choices = assets?.filter((asset) => asset.kind === kind) ?? [];

  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      {selected ? (
        <AssetThumb asset={selected} className="w-16 shrink-0" />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <ImageOff className="size-6" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="truncate text-sm text-foreground">{selected?.title ?? `No ${noun} chosen`}</p>
        <div className="flex flex-wrap gap-2">
          <Modal
            title={`Choose ${kind === "IMAGE" ? "an" : "a"} ${noun}`}
            className="max-h-[85dvh] max-w-3xl overflow-y-auto"
            trigger={
              <Button type="button" variant="outline" size="sm" disabled={disabled}>
                {selected ? "Change" : "Choose"}
              </Button>
            }
          >
            {({ close }) =>
              choices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  There are no {noun}s in the Media Library yet. Add one on the Media Library page (it opens fine in
                  another tab), then return here and reopen this window.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {choices.map((asset) => (
                    <li key={asset.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(asset.id);
                          close();
                        }}
                        aria-pressed={asset.id === value}
                        className="flex w-full flex-col gap-2 rounded-md border p-2 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-primary"
                      >
                        <AssetThumb asset={asset} className="w-full" />
                        <span className="truncate text-xs text-foreground">{asset.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            }
          </Modal>
          {selected && (
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange("")}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

type MediaFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  kind?: MediaAssetKind;
  /** The Media Library, loaded once by the form and shared by all of its pickers. */
  assets: LibraryAsset[] | undefined;
  disabled?: boolean;
};

/** A form field whose value is the id of a Media Library file ("" when none is chosen). */
export function MediaField<T extends FieldValues>({ name, label, kind = "IMAGE", assets, disabled }: MediaFieldProps<T>) {
  const { control } = useFormContext<T>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.error ? "true" : undefined}>
          <FieldLabel>{label}</FieldLabel>
          <MediaPicker
            kind={kind}
            value={(field.value as string | undefined) ?? ""}
            assets={assets}
            disabled={disabled}
            onChange={field.onChange}
          />
          <FieldError errors={fieldState.error ? [fieldState.error] : []} />
        </Field>
      )}
    />
  );
}
