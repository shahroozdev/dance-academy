"use server";

import { requireContentUser } from "@/actions/content-access";
import { recordContentAudit, revalidatePublicSite } from "@/actions/content-service";
import { contentEntitySchema, contentStatusSchema } from "@/actions/content.schema";
import { idSchema } from "@/actions/validation.schema";
import { assertStatusChange } from "@/lib/content-publishing";
import { db } from "@/lib/db";
import type { ContentEntity, ContentStatus } from "@/types/content";

type StatusChange = {
  status: ContentStatus;
  publishedAt?: Date;
  publishedById?: string;
  publishedByName?: string;
};

type StatusTarget = {
  find: (id: string) => Promise<{ status: ContentStatus; name: string; paths: string[] }>;
  update: (id: string, data: StatusChange) => Promise<unknown>;
};

const statusTargets: Record<ContentEntity, StatusTarget> = {
  festival: {
    find: async (id) => {
      const festival = await db.festival.findUniqueOrThrow({ where: { id }, select: { status: true, year: true } });
      return { status: festival.status, name: `the ${festival.year} festival`, paths: ["/ananta", `/ananta/${festival.year}`] };
    },
    update: (id, data) => db.festival.update({ where: { id }, data }),
  },
  performance: {
    find: async (id) => {
      const performance = await db.performance.findUniqueOrThrow({
        where: { id },
        select: { status: true, title: true, slug: true },
      });
      return {
        status: performance.status,
        name: `the performance "${performance.title}"`,
        paths: ["/performances", `/performances/${performance.slug}`],
      };
    },
    update: (id, data) => db.performance.update({ where: { id }, data }),
  },
  press: {
    find: async (id) => {
      const item = await db.pressItem.findUniqueOrThrow({ where: { id }, select: { status: true, title: true } });
      return { status: item.status, name: `the press item "${item.title}"`, paths: ["/press"] };
    },
    update: (id, data) => db.pressItem.update({ where: { id }, data }),
  },
};

const statusVerbs: Record<ContentStatus, string> = {
  PUBLISHED: "Published",
  DRAFT: "Returned to draft",
  ARCHIVED: "Archived",
};

/** Publish, unpublish, archive, or restore one item. Content Owners only. */
export async function setContentStatus(entity: ContentEntity, id: string, status: ContentStatus) {
  const user = await requireContentUser();
  entity = contentEntitySchema.parse(entity);
  id = idSchema.parse(id);
  status = contentStatusSchema.parse(status);

  const target = statusTargets[entity];
  const current = await target.find(id);
  assertStatusChange(user.role, current.status, status);

  await target.update(
    id,
    status === "PUBLISHED"
      ? { status, publishedAt: new Date(), publishedById: user.id, publishedByName: user.name }
      : { status },
  );
  await recordContentAudit(user, {
    action: status.toLowerCase(),
    entityType: entity,
    entityId: id,
    summary: `${statusVerbs[status]} ${current.name}.`,
  });
  revalidatePublicSite(current.paths);
  return { status };
}
