"use server";

import { del, put } from "@vercel/blob";

import { requireContentOwner, requireContentUser } from "@/actions/content-access";
import { recordContentAudit, revalidateWholePublicSite } from "@/actions/content-service";
import {
  mediaDetailsSchema,
  mediaLinkSchema,
  mediaListSchema,
  mediaUploadReceiptSchema,
  uploadKindSchema,
  type MediaDetailsInput,
  type MediaLinkInput,
  type MediaUploadReceiptInput,
} from "@/actions/content.schema";
import { idSchema } from "@/actions/validation.schema";
import type { Prisma } from "@/generated/prisma/client";
import {
  CLOUDINARY_FOLDER,
  CLOUDINARY_UPLOADS,
  createUploadTicket,
  deleteFromCloudinary,
  isGenuineUploadReceipt,
  storedAssetUrl,
  type CloudinaryUploadKind,
} from "@/lib/cloudinary";
import { isCloudinaryUrl } from "@/lib/cloudinary-url";
import { db } from "@/lib/db";
import type { MediaAssetKind } from "@/types/content";

// Where the Media Library keeps files: images and videos go straight from the browser to
// Cloudinary, which resizes and compresses them on delivery. PDFs are small and need none of
// that, so they stay in the Vercel Blob store the admin side already uses.

// Kept under the 5 MB request limit set for uploads in next.config.ts.
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

const usageCount = {
  select: {
    festivalMedia: true,
    festivalArtists: true,
    performances: true,
    performanceMedia: true,
    pressImages: true,
    pressDocuments: true,
    profiles: true,
    siteSlots: true,
  },
} satisfies Prisma.MediaAssetInclude["_count"];

const countUses = (counts: Record<string, number>) => Object.values(counts).reduce((total, count) => total + count, 0);

export async function getContentMediaAssets(params?: { kind?: MediaAssetKind; search?: string }) {
  await requireContentUser();
  const { kind, search } = mediaListSchema.parse(params ?? {});

  const assets = await db.mediaAsset.findMany({
    where: {
      ...(kind && { kind }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { altText: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { _count: usageCount },
  });
  return assets.map(({ _count, ...asset }) => ({ ...asset, usageCount: countUses(_count) }));
}

/** Step 1 of an image or video upload: permission for the browser to send one file to Cloudinary. */
export async function createContentUploadTicket(kind: CloudinaryUploadKind) {
  await requireContentUser();
  return createUploadTicket(uploadKindSchema.parse(kind));
}

/** Step 2: adds the file Cloudinary has just stored to the library. */
export async function registerContentUpload(receipt: MediaUploadReceiptInput) {
  const user = await requireContentUser();
  receipt = mediaUploadReceiptSchema.parse(receipt);

  const { formats, maxBytes } = CLOUDINARY_UPLOADS[receipt.kind];
  const isOurUpload =
    receipt.publicId.startsWith(`${CLOUDINARY_FOLDER}/`) &&
    (formats as readonly string[]).includes(receipt.format) &&
    isGenuineUploadReceipt(receipt);
  if (!isOurUpload) throw new Error("This upload could not be verified. Please upload the file again.");

  const url = storedAssetUrl(receipt.kind, receipt.publicId, receipt.format);
  if (receipt.bytes > maxBytes) {
    await deleteFromCloudinary(url);
    throw new Error(`This file is too large. The limit is ${maxBytes / 1024 / 1024} MB.`);
  }
  if (receipt.kind === "IMAGE" && !receipt.altText) {
    await deleteFromCloudinary(url);
    throw new Error("Describe the image in a few words, so visitors using a screen reader know what it shows.");
  }

  const asset = await db.mediaAsset.create({
    data: {
      kind: receipt.kind,
      url,
      title: receipt.title,
      altText: receipt.altText,
      contentType: CONTENT_TYPES[receipt.format],
      sizeBytes: receipt.bytes,
      uploadedById: user.id,
      uploadedByName: user.name,
    },
    select: { id: true },
  });
  await recordContentAudit(user, {
    action: "uploaded",
    entityType: "media",
    entityId: asset.id,
    summary: `Uploaded "${receipt.title}" to the Media Library.`,
  });
  return asset;
}

/** Stores a PDF in the Blob store and adds it to the library. */
export async function uploadContentDocument(formData: FormData) {
  const user = await requireContentUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file to upload.");
  if (file.type !== "application/pdf") throw new Error("Documents must be PDF files.");
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error("PDF documents must be 4 MB or smaller.");

  const title = String(formData.get("title") ?? "").trim() || file.name;
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const blob = await put(`website/document/${safeName}`, file, { access: "public", addRandomSuffix: true });

  const asset = await db.mediaAsset.create({
    data: {
      kind: "DOCUMENT",
      url: blob.url,
      title: title.slice(0, 200),
      contentType: file.type,
      sizeBytes: file.size,
      uploadedById: user.id,
      uploadedByName: user.name,
    },
    select: { id: true },
  });
  await recordContentAudit(user, {
    action: "uploaded",
    entityType: "media",
    entityId: asset.id,
    summary: `Uploaded "${title}" to the Media Library.`,
  });
  return asset;
}

/** Adds a video or document that is hosted elsewhere (for example a YouTube link). */
export async function addContentMediaLink(data: MediaLinkInput) {
  const user = await requireContentUser();
  data = mediaLinkSchema.parse(data);

  const asset = await db.mediaAsset.create({
    data: { kind: data.kind, url: data.url, title: data.title, uploadedById: user.id, uploadedByName: user.name },
    select: { id: true },
  });
  await recordContentAudit(user, {
    action: "added",
    entityType: "media",
    entityId: asset.id,
    summary: `Added the ${data.kind.toLowerCase()} link "${data.title}" to the Media Library.`,
  });
  return asset;
}

export async function updateContentMedia(id: string, data: MediaDetailsInput) {
  const user = await requireContentUser();
  id = idSchema.parse(id);
  data = mediaDetailsSchema.parse(data);

  const existing = await db.mediaAsset.findUniqueOrThrow({ where: { id }, include: { _count: usageCount } });
  const isInUse = countUses(existing._count) > 0;
  // Details of a file already placed on the website change what visitors see straight away.
  if (isInUse && user.role !== "OWNER") throw new Error("Only a Content Owner can change a file that is in use on the website.");
  if (existing.kind === "IMAGE" && !data.altText) throw new Error("Images need a short description.");

  await db.mediaAsset.update({
    where: { id },
    data: {
      title: data.title,
      altText: data.altText,
      attribution: data.attribution || null,
      focalX: Number(data.focalX),
      focalY: Number(data.focalY),
    },
  });
  await recordContentAudit(user, {
    action: "updated",
    entityType: "media",
    entityId: id,
    summary: `Updated the details of "${data.title}".`,
  });
  if (isInUse) revalidateWholePublicSite();
  return { id };
}

const BLOB_HOST_PATTERN = /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//;

export async function deleteContentMedia(id: string) {
  const user = await requireContentOwner();
  id = idSchema.parse(id);

  const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id }, include: { _count: usageCount } });
  if (countUses(asset._count) > 0) {
    throw new Error("This file is still used by website content. Remove it from that content first.");
  }

  await db.mediaAsset.delete({ where: { id } });
  // Only files held in our own storage are removed from it; links to other sites are left alone.
  if (isCloudinaryUrl(asset.url)) await deleteFromCloudinary(asset.url);
  if (BLOB_HOST_PATTERN.test(asset.url)) await del(asset.url);
  await recordContentAudit(user, {
    action: "deleted",
    entityType: "media",
    entityId: id,
    summary: `Deleted "${asset.title}" from the Media Library.`,
  });
  return { id };
}
