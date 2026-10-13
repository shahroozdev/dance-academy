"use client";

import { Link2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { z } from "zod";

import {
  mediaDetailsSchema,
  mediaLinkSchema,
  type MediaDetailsInput,
  type MediaLinkInput,
} from "@/actions/content.schema";
import { Button } from "@/components/common/button";
import { Field, FieldDescription, FieldLabel } from "@/components/common/field";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { ModalFooter } from "@/components/content/editor-parts";
import type { LibraryAsset } from "@/components/content/media-field";
import type { QueryKey } from "@/hooks/query-registry";
import { useMutate } from "@/hooks/useMutate";

const INVALIDATE_KEYS: QueryKey[] = ["getContentMediaAssets", "getContentOverview"];

const uploadDetailsSchema = z.object({ title: z.string().trim().max(200), altText: z.string().trim().max(400) });
type UploadDetails = z.infer<typeof uploadDetailsSchema>;
const EMPTY_UPLOAD: UploadDetails = { title: "", altText: "" };

const FILE_KINDS: Record<string, "IMAGE" | "VIDEO" | "DOCUMENT"> = {
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
  "video/mp4": "VIDEO",
  "video/quicktime": "VIDEO",
  "video/webm": "VIDEO",
  "application/pdf": "DOCUMENT",
};

type CloudinaryResult = {
  public_id?: string;
  version?: number;
  signature?: string;
  format?: string;
  bytes?: number;
  error?: { message: string };
};

/** Uploads an image, video, or PDF from this computer into the Media Library. */
export function MediaUploadModal() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<unknown>(null);
  const { mutate: createTicket } = useMutate("createContentUploadTicket");
  const { mutate: register } = useMutate("registerContentUpload", { invalidateKeys: INVALIDATE_KEYS });
  const { mutate: uploadDocument } = useMutate("uploadContentDocument", { invalidateKeys: INVALIDATE_KEYS });

  /** Images and videos go straight from this browser to storage, then are added to the library. */
  const uploadToStorage = async (file: File, kind: "IMAGE" | "VIDEO", details: UploadDetails) => {
    const ticket = await createTicket(kind);
    if (file.size > ticket.maxBytes) {
      throw new Error(`This file is too large. The limit is ${ticket.maxBytes / 1024 / 1024} MB.`);
    }

    const body = new FormData();
    for (const [name, value] of Object.entries(ticket.fields)) body.set(name, String(value));
    body.set("file", file);
    const response = await fetch(ticket.uploadUrl, { method: "POST", body });
    const result = (await response.json()) as CloudinaryResult;
    if (!response.ok || !result.public_id || !result.version || !result.signature || !result.format || !result.bytes) {
      throw new Error(result.error?.message ?? "The file could not be uploaded. Please try again.");
    }

    await register({
      kind,
      publicId: result.public_id,
      version: result.version,
      signature: result.signature,
      format: result.format,
      bytes: result.bytes,
      title: details.title || file.name,
      altText: details.altText,
    });
  };

  const upload = async (details: UploadDetails) => {
    const file = fileInput.current?.files?.[0];
    if (!file) throw new Error("Choose a file to upload.");
    const kind = FILE_KINDS[file.type];
    if (!kind) throw new Error("Upload a JPEG, PNG, or WebP image, an MP4, MOV, or WebM video, or a PDF.");
    if (kind === "IMAGE" && !details.altText) {
      throw new Error("Describe the image in a few words, so visitors using a screen reader know what it shows.");
    }

    if (kind === "DOCUMENT") {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("title", details.title);
      await uploadDocument(formData);
      return;
    }
    await uploadToStorage(file, kind, details);
  };

  return (
    <Modal
      title="Upload a file"
      className="max-w-md"
      closeOnOutsideClick={!isUploading}
      trigger={
        <Button>
          <Upload />
          Upload File
        </Button>
      }
    >
      {({ close }) => (
        <FORM
          schema={uploadDetailsSchema}
          defaultValues={EMPTY_UPLOAD}
          className="space-y-4"
          onSubmit={async (values) => {
            setIsUploading(true);
            setUploadError(null);
            try {
              await upload(values);
              close();
            } catch (error) {
              setUploadError(error);
            } finally {
              setIsUploading(false);
            }
          }}
        >
          <Field>
            <FieldLabel htmlFor="media-file">File</FieldLabel>
            <input
              ref={fileInput}
              id="media-file"
              type="file"
              accept={Object.keys(FILE_KINDS).join(",")}
              className="text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
            <FieldDescription>
              An image (JPEG, PNG, WebP) up to 10 MB, a video (MP4, MOV, WebM) up to 100 MB, or a PDF up to 4 MB. A
              large video can take a few minutes to upload, and a minute or two more before it plays on the website.
            </FieldDescription>
          </Field>
          <FormFeilds<UploadDetails> name="title" label="Title" placeholder="Leave empty to use the file name" />
          <FormFeilds<UploadDetails>
            name="altText"
            label="Description for screen readers"
            placeholder="What the image shows (required for images)"
          />
          <ModalFooter error={uploadError} isLoading={isUploading} submitLabel="Upload" onCancel={close} />
        </FORM>
      )}
    </Modal>
  );
}

const KIND_OPTIONS = [
  { label: "Video", value: "VIDEO" },
  { label: "Document", value: "DOCUMENT" },
];
const EMPTY_LINK: MediaLinkInput = { kind: "VIDEO", title: "", url: "" };

/** Adds a video or document that lives elsewhere, such as a YouTube link. */
export function MediaLinkModal() {
  const { mutate, isLoading, error } = useMutate("addContentMediaLink", { invalidateKeys: INVALIDATE_KEYS });

  return (
    <Modal
      title="Add a link"
      className="max-w-md"
      closeOnOutsideClick={!isLoading}
      trigger={
        <Button variant="outline">
          <Link2 />
          Add Link
        </Button>
      }
    >
      {({ close }) => (
        <FORM
          schema={mediaLinkSchema}
          defaultValues={EMPTY_LINK}
          className="space-y-4"
          onSubmit={async (values) => {
            try {
              await mutate(values);
              close();
            } catch {
              /* The error is shown below. */
            }
          }}
        >
          <FormFeilds<MediaLinkInput> name="kind" label="Type" type="select" options={KIND_OPTIONS} />
          <FormFeilds<MediaLinkInput> name="title" label="Title" required />
          <FormFeilds<MediaLinkInput>
            name="url"
            label="Link"
            placeholder="https://www.youtube.com/watch?v=..."
            required
          />
          <ModalFooter error={error} isLoading={isLoading} submitLabel="Add" onCancel={close} />
        </FORM>
      )}
    </Modal>
  );
}

/** Edits a library file's title, description, credit, and focal point. */
export function MediaDetailsModal({ asset }: { asset: LibraryAsset }) {
  const { mutate, isLoading, error } = useMutate("updateContentMedia", { invalidateKeys: INVALIDATE_KEYS });
  const defaultValues: MediaDetailsInput = {
    title: asset.title,
    altText: asset.altText,
    attribution: asset.attribution ?? "",
    focalX: String(asset.focalX),
    focalY: String(asset.focalY),
  };

  return (
    <Modal
      title="File details"
      className="max-w-md"
      closeOnOutsideClick={!isLoading}
      trigger={
        <Button variant="outline" size="sm">
          Details
        </Button>
      }
    >
      {({ close }) => (
        <FORM
          schema={mediaDetailsSchema}
          defaultValues={defaultValues}
          className="space-y-4"
          onSubmit={async (values) => {
            try {
              await mutate(asset.id, values);
              close();
            } catch {
              /* The error is shown below. */
            }
          }}
        >
          <FormFeilds<MediaDetailsInput> name="title" label="Title" required />
          <FormFeilds<MediaDetailsInput> name="altText" label="Description for screen readers" />
          <FormFeilds<MediaDetailsInput> name="attribution" label="Photo credit" placeholder="Optional" />
          {asset.kind === "IMAGE" && (
            <div className="grid grid-cols-2 gap-4">
              <FormFeilds<MediaDetailsInput> name="focalX" label="Focus from left (%)" type="number" min="0" max="100" />
              <FormFeilds<MediaDetailsInput> name="focalY" label="Focus from top (%)" type="number" min="0" max="100" />
            </div>
          )}
          <ModalFooter error={error} isLoading={isLoading} submitLabel="Save" onCancel={close} />
        </FORM>
      )}
    </Modal>
  );
}
