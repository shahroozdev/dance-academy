"use server";

import { requireContentUser } from "@/actions/content-access";
import { assertAssetKinds, recordContentAudit, revalidatePublicSite } from "@/actions/content-service";
import { performanceSchema, type PerformanceInput } from "@/actions/content.schema";
import { idSchema } from "@/actions/validation.schema";
import { parseDateInput, slugify } from "@/lib/content-format";
import { performanceInclude } from "@/lib/content-mappers";
import { assertCanRevise, statusAfterRevision } from "@/lib/content-publishing";
import { db } from "@/lib/db";

const performancePaths = (slug: string) => ["/performances", `/performances/${slug}`];

export async function getContentPerformances() {
  await requireContentUser();
  return db.performance.findMany({
    orderBy: [{ eventDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      eventDate: true,
      venue: true,
      status: true,
      publishedAt: true,
      publishedByName: true,
      updatedAt: true,
      _count: { select: { media: true } },
    },
  });
}

export async function getContentPerformanceById(id: string) {
  await requireContentUser();
  return db.performance.findUniqueOrThrow({ where: { id: idSchema.parse(id) }, include: performanceInclude });
}

/** The page address: the one typed in, or one made from the title. Always unique. */
async function resolveSlug(data: PerformanceInput, currentId?: string) {
  const slug = data.slug || slugify(data.title);
  if (!slug) throw new Error("Enter a page address using letters or numbers.");
  const sameSlug = await db.performance.findUnique({ where: { slug }, select: { id: true } });
  if (sameSlug && sameSlug.id !== currentId) {
    throw new Error(`Another performance already uses the page address "${slug}". Enter a different one.`);
  }
  return slug;
}

const performanceColumns = (data: PerformanceInput, slug: string) => ({
  slug,
  title: data.title,
  eventDate: data.eventDate ? parseDateInput(data.eventDate) : null,
  venue: data.venue || null,
  summary: data.summary,
  description: data.description || null,
  coverId: data.coverId || null,
  videoUrl: data.videoUrl || null,
  externalUrl: data.externalUrl || null,
});

const mediaRows = (data: PerformanceInput) =>
  data.media.map((item, sortOrder) => ({ assetId: item.assetId, caption: item.caption || null, sortOrder }));

const assertPerformanceImages = (data: PerformanceInput) =>
  assertAssetKinds([
    ...(data.coverId ? [{ assetId: data.coverId, kind: "IMAGE" as const, label: "The cover" }] : []),
    ...data.media.map((item) => ({ assetId: item.assetId, kind: "IMAGE" as const, label: "A gallery item" })),
  ]);

export async function createPerformance(data: PerformanceInput) {
  const user = await requireContentUser();
  data = performanceSchema.parse(data);
  const slug = await resolveSlug(data);
  await assertPerformanceImages(data);

  const performance = await db.performance.create({
    data: { ...performanceColumns(data, slug), media: { create: mediaRows(data) } },
    select: { id: true },
  });
  await recordContentAudit(user, {
    action: "created",
    entityType: "performance",
    entityId: performance.id,
    summary: `Created the performance "${data.title}" as a draft.`,
  });
  return performance;
}

export async function updatePerformance(id: string, data: PerformanceInput) {
  const user = await requireContentUser();
  id = idSchema.parse(id);
  data = performanceSchema.parse(data);

  const existing = await db.performance.findUniqueOrThrow({ where: { id }, select: { status: true, slug: true } });
  assertCanRevise(user.role, existing.status);
  const slug = await resolveSlug(data, id);
  await assertPerformanceImages(data);
  const status = statusAfterRevision(existing.status);

  await db.$transaction([
    db.performanceMedia.deleteMany({ where: { performanceId: id } }),
    db.performance.update({
      where: { id },
      data: { ...performanceColumns(data, slug), status, media: { create: mediaRows(data) } },
    }),
  ]);
  await recordContentAudit(user, {
    action: "updated",
    entityType: "performance",
    entityId: id,
    summary:
      existing.status === "PUBLISHED"
        ? `Revised the performance "${data.title}"; it returned to draft until published again.`
        : `Updated the performance "${data.title}".`,
  });
  if (existing.status === "PUBLISHED") revalidatePublicSite(performancePaths(existing.slug));
  return { id, status };
}
