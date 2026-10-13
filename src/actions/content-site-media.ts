"use server";

import { z } from "zod";

import { requireContentOwner, requireContentUser } from "@/actions/content-access";
import { assertAssetKinds, recordContentAudit, revalidateWholePublicSite } from "@/actions/content-service";
import { idSchema } from "@/actions/validation.schema";
import { db } from "@/lib/db";
import { SITE_MEDIA_SLOT_KEYS, SITE_MEDIA_SLOTS, findSiteMediaSlot } from "@/lib/site-media";

const slotKeySchema = z.string().refine((key) => SITE_MEDIA_SLOT_KEYS.includes(key), "Unknown place on the website.");

/** Every fixed place on the website with the Media Library file chosen for it, if any. */
export async function getContentSiteMedia() {
  await requireContentUser();
  const chosen = await db.siteMediaSlot.findMany({ select: { key: true, assetId: true } });
  const assetIdByKey = new Map(chosen.map((slot) => [slot.key, slot.assetId]));

  return SITE_MEDIA_SLOTS.map((slot) => ({
    key: slot.key,
    label: slot.label,
    kind: slot.kind,
    assetId: assetIdByKey.get(slot.key) ?? "",
  }));
}

/**
 * Chooses the file shown in one place on the website, or (with an empty id) goes back to the
 * file that ships with the site. This changes a live page straight away, so it is owner-only.
 */
export async function setSiteMediaSlot(key: string, assetId: string) {
  const owner = await requireContentOwner();
  key = slotKeySchema.parse(key);
  const slot = findSiteMediaSlot(key);
  if (!slot) throw new Error("Unknown place on the website.");

  if (assetId === "") {
    await db.siteMediaSlot.deleteMany({ where: { key } });
  } else {
    assetId = idSchema.parse(assetId);
    await assertAssetKinds([{ assetId, kind: slot.kind, label: `The file for "${slot.label}"` }]);
    await db.siteMediaSlot.upsert({
      where: { key },
      create: { key, assetId, updatedByName: owner.name },
      update: { assetId, updatedByName: owner.name },
    });
  }

  await recordContentAudit(owner, {
    action: "updated",
    entityType: "site-media",
    entityId: key,
    summary: assetId ? `Changed the file for "${slot.label}".` : `Returned "${slot.label}" to its original file.`,
  });
  revalidateWholePublicSite();
  return { key };
}
