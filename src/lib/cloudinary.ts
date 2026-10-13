import { createHash, randomUUID } from "node:crypto";

import {
  VIDEO_DELIVERY_TRANSFORMATION,
  cloudinaryAssetUrl,
  parseCloudinaryUrl,
  type CloudinaryResourceType,
} from "@/lib/cloudinary-url";

// Server-side Cloudinary access for the Content Portal's Media Library (the admin side keeps
// using Vercel Blob for the logo and receipts). Only ever imported by server actions and
// scripts: it reads the API secret. The plain HTTP API is used, so no SDK is needed.

export const CLOUDINARY_FOLDER = "malhaar/website";

export const CLOUDINARY_UPLOADS = {
  IMAGE: { resourceType: "image", formats: ["jpg", "jpeg", "png", "webp"], maxBytes: 10 * 1024 * 1024 },
  VIDEO: { resourceType: "video", formats: ["mp4", "mov", "webm"], maxBytes: 100 * 1024 * 1024 },
} as const;

export type CloudinaryUploadKind = keyof typeof CLOUDINARY_UPLOADS;

const UPLOAD_CHUNK_BYTES = 6 * 1024 * 1024;

// Large videos cannot be compressed at the moment a visitor asks for them, so the compressed
// copy the pages play is requested at upload time and prepared in the background. Until it is
// ready (usually a minute or two) the video does not play.
const extraUploadFields = (kind: CloudinaryUploadKind): Record<string, string> =>
  kind === "VIDEO" ? { eager: VIDEO_DELIVERY_TRANSFORMATION, eager_async: "true" } : {};

export function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Image and video storage is not set up yet (the Cloudinary settings are missing).");
  }
  return { cloudName, apiKey, apiSecret };
}

/** Cloudinary's request signature: the parameters in name order, then the secret, hashed. */
export function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(payload + apiSecret).digest("hex");
}

const apiUrl = (cloudName: string, resourceType: CloudinaryResourceType, call: "upload" | "destroy") =>
  `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/${call}`;

/**
 * Everything a browser needs to send one file straight to Cloudinary. The signature covers the
 * folder and the allowed formats, so it cannot be reused to upload anything else anywhere else,
 * and it expires an hour after `timestamp`. The secret never leaves the server.
 */
export function createUploadTicket(kind: CloudinaryUploadKind) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const { resourceType, formats, maxBytes } = CLOUDINARY_UPLOADS[kind];
  const fields = {
    ...extraUploadFields(kind),
    allowed_formats: formats.join(","),
    folder: CLOUDINARY_FOLDER,
    timestamp: Math.floor(Date.now() / 1000),
  };
  return {
    uploadUrl: apiUrl(cloudName, resourceType, "upload"),
    maxBytes,
    fields: { ...fields, api_key: apiKey, signature: signCloudinaryParams(fields, apiSecret) },
  };
}

type UploadReceipt = { publicId: string; version: number; signature: string };

/**
 * Whether an upload result really came from Cloudinary for this account. Cloudinary signs the
 * public id and version it returns; checking that stops a caller registering a file it did not
 * upload through a ticket issued here.
 */
export function isGenuineUploadReceipt({ publicId, version, signature }: UploadReceipt) {
  const { apiSecret } = getCloudinaryConfig();
  return signCloudinaryParams({ public_id: publicId, version }, apiSecret) === signature;
}

export function storedAssetUrl(kind: CloudinaryUploadKind, publicId: string, format: string) {
  const { cloudName } = getCloudinaryConfig();
  return cloudinaryAssetUrl({ cloudName, resourceType: CLOUDINARY_UPLOADS[kind].resourceType, publicId, format });
}

type CloudinaryResult = { error?: { message: string }; result?: string; bytes?: number; format?: string };

async function callCloudinary(url: string, body: FormData, headers?: Record<string, string>) {
  const response = await fetch(url, { method: "POST", body, headers });
  const result = (await response.json()) as CloudinaryResult;
  if (!response.ok || result.error) throw new Error(result.error?.message ?? `Cloudinary request failed (${response.status}).`);
  return result;
}

type ServerUpload = { kind: CloudinaryUploadKind; file: Blob; publicId: string };

/**
 * Uploads a file from the server under a fixed public id, replacing any earlier copy, and
 * returns its stored address. Used by the scripts that move the site's own files into Cloudinary.
 */
export async function uploadToCloudinary({ kind, file, publicId }: ServerUpload) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const { resourceType } = CLOUDINARY_UPLOADS[kind];
  const fields = {
    ...extraUploadFields(kind),
    overwrite: "true",
    public_id: publicId,
    timestamp: Math.floor(Date.now() / 1000),
  };

  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.set(name, String(value));
  body.set("api_key", apiKey);
  body.set("signature", signCloudinaryParams(fields, apiSecret));

  // A large file is sent in pieces: one long request can time out before Cloudinary answers.
  // Every piece carries the same signed fields and upload id; the reply to the last one
  // describes the finished file.
  const url = apiUrl(cloudName, resourceType, "upload");
  const uploadId = randomUUID();
  let result: CloudinaryResult = {};
  for (let start = 0; start < file.size; start += UPLOAD_CHUNK_BYTES) {
    const end = Math.min(start + UPLOAD_CHUNK_BYTES, file.size);
    const chunk = new FormData();
    for (const [name, value] of body.entries()) chunk.set(name, value);
    chunk.set("file", file.slice(start, end), "upload");
    result = await callCloudinary(url, chunk, {
      "X-Unique-Upload-Id": uploadId,
      "Content-Range": `bytes ${start}-${end - 1}/${file.size}`,
    });
  }
  return { url: storedAssetUrl(kind, publicId, result.format ?? "jpg"), bytes: result.bytes ?? file.size };
}

/** Removes a stored file from Cloudinary. Does nothing for an address that is not one of ours. */
export async function deleteFromCloudinary(url: string) {
  const address = parseCloudinaryUrl(url);
  if (!address) return;
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const fields = { public_id: address.publicId, timestamp: Math.floor(Date.now() / 1000) };

  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.set(name, String(value));
  body.set("api_key", apiKey);
  body.set("signature", signCloudinaryParams(fields, apiSecret));

  await callCloudinary(apiUrl(cloudName, address.resourceType, "destroy"), body);
}
