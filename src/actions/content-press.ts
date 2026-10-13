"use server";

import { requireContentUser } from "@/actions/content-access";
import { assertAssetKinds, recordContentAudit, revalidatePublicSite } from "@/actions/content-service";
import { pressItemSchema, type PressItemInput } from "@/actions/content.schema";
import { idSchema } from "@/actions/validation.schema";
import { parseDateInput } from "@/lib/content-format";
import { pressItemInclude } from "@/lib/content-mappers";
import { assertCanRevise, statusAfterRevision } from "@/lib/content-publishing";
import { db } from "@/lib/db";

export async function getContentPressItems() {
  await requireContentUser();
  return db.pressItem.findMany({
    orderBy: [{ publishedOn: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      outlet: true,
      kind: true,
      publishedOn: true,
      status: true,
      publishedAt: true,
      publishedByName: true,
      updatedAt: true,
    },
  });
}

export async function getContentPressItemById(id: string) {
  await requireContentUser();
  return db.pressItem.findUniqueOrThrow({ where: { id: idSchema.parse(id) }, include: pressItemInclude });
}

const pressColumns = (data: PressItemInput) => ({
  title: data.title,
  outlet: data.outlet || null,
  kind: data.kind,
  publishedOn: data.publishedOn ? parseDateInput(data.publishedOn) : null,
  excerpt: data.excerpt || null,
  externalUrl: data.externalUrl || null,
  imageId: data.imageId || null,
  documentId: data.documentId || null,
});

async function validatePressItem(data: PressItemInput) {
  if (!data.externalUrl && !data.documentId) {
    throw new Error("Add a link to the article or attach a document, so visitors have something to open.");
  }
  await assertAssetKinds([
    ...(data.imageId ? [{ assetId: data.imageId, kind: "IMAGE" as const, label: "The feature image" }] : []),
    ...(data.documentId ? [{ assetId: data.documentId, kind: "DOCUMENT" as const, label: "The attached document" }] : []),
  ]);
}

export async function createPressItem(data: PressItemInput) {
  const user = await requireContentUser();
  data = pressItemSchema.parse(data);
  await validatePressItem(data);

  const item = await db.pressItem.create({ data: pressColumns(data), select: { id: true } });
  await recordContentAudit(user, {
    action: "created",
    entityType: "press",
    entityId: item.id,
    summary: `Created the press item "${data.title}" as a draft.`,
  });
  return item;
}

export async function updatePressItem(id: string, data: PressItemInput) {
  const user = await requireContentUser();
  id = idSchema.parse(id);
  data = pressItemSchema.parse(data);

  const existing = await db.pressItem.findUniqueOrThrow({ where: { id }, select: { status: true } });
  assertCanRevise(user.role, existing.status);
  await validatePressItem(data);
  const status = statusAfterRevision(existing.status);

  await db.pressItem.update({ where: { id }, data: { ...pressColumns(data), status } });
  await recordContentAudit(user, {
    action: "updated",
    entityType: "press",
    entityId: id,
    summary:
      existing.status === "PUBLISHED"
        ? `Revised the press item "${data.title}"; it returned to draft until published again.`
        : `Updated the press item "${data.title}".`,
  });
  if (existing.status === "PUBLISHED") revalidatePublicSite(["/press"]);
  return { id, status };
}
