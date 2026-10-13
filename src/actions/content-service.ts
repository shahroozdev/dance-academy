import "server-only";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import type { ContentActor } from "@/types/content";

type AuditEntry = { action: string; entityType: string; entityId?: string; summary: string };

/** Adds a line to the content history. Never records passwords or other private values. */
export async function recordContentAudit(actor: ContentActor, entry: AuditEntry) {
  await db.contentAuditLog.create({
    data: { userId: actor.id, userName: actor.name, ...entry },
  });
}

/**
 * Refreshes the public pages a content change can affect. The home page and the sitemap are
 * always included because both list festivals, performances, and site details.
 */
export function revalidatePublicSite(paths: readonly string[] = []) {
  for (const path of new Set(["/", "/sitemap.xml", ...paths])) revalidatePath(path);
}

/** Every public page, for changes shown in the shared header and footer. */
export function revalidateWholePublicSite() {
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
}

/** Throws unless every id is a library asset of the expected kind. */
export async function assertAssetKinds(expected: readonly { assetId: string; kind: "IMAGE" | "VIDEO" | "DOCUMENT"; label: string }[]) {
  if (expected.length === 0) return;
  const assets = await db.mediaAsset.findMany({
    where: { id: { in: expected.map((item) => item.assetId) } },
    select: { id: true, kind: true },
  });
  const kindById = new Map(assets.map((asset) => [asset.id, asset.kind]));
  for (const item of expected) {
    const kind = kindById.get(item.assetId);
    if (!kind) throw new Error(`${item.label} is no longer in the Media Library.`);
    if (kind !== item.kind) throw new Error(`${item.label} must be ${item.kind === "IMAGE" ? "an image" : `a ${item.kind.toLowerCase()}`}.`);
  }
}
