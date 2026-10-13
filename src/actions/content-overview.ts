"use server";

import { z } from "zod";

import { requireContentOwner, requireContentUser } from "@/actions/content-access";
import { db } from "@/lib/db";
import type { ContentEntity, ContentStatus } from "@/types/content";

type StatusCounts = Record<ContentStatus, number>;

// These tables hold a handful of rows each, so the statuses are simply read and counted.
const statusOnly = { select: { status: true } } as const;

function toStatusCounts(rows: { status: ContentStatus }[]) {
  const counts: StatusCounts = { DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

/** What the portal's first screen shows: how much is in draft, live, and archived. */
export async function getContentOverview() {
  const user = await requireContentUser();

  const [festivals, performances, press, mediaCount, visibleProfiles, hiddenProfiles, recentActivity] = await Promise.all([
    db.festival.findMany(statusOnly),
    db.performance.findMany(statusOnly),
    db.pressItem.findMany(statusOnly),
    db.mediaAsset.count(),
    db.publicProfile.count({ where: { isVisible: true } }),
    db.publicProfile.count({ where: { isVisible: false } }),
    // The history names content users, so only an owner sees it.
    user.role === "OWNER" ? db.contentAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }) : [],
  ]);

  const counts: Record<ContentEntity, StatusCounts> = {
    festival: toStatusCounts(festivals),
    performance: toStatusCounts(performances),
    press: toStatusCounts(press),
  };
  return { role: user.role, counts, mediaCount, visibleProfiles, hiddenProfiles, recentActivity };
}

const historyQuerySchema = z
  .object({ page: z.number().int().min(1).max(100000).optional(), pageSize: z.number().int().min(1).max(100).optional() })
  .strict();

export async function getContentHistory(params?: { page?: number; pageSize?: number }) {
  await requireContentOwner();
  const { page = 1, pageSize = 20 } = historyQuerySchema.parse(params ?? {});

  const [data, total] = await Promise.all([
    db.contentAuditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    db.contentAuditLog.count(),
  ]);
  return { data, total, pages: Math.ceil(total / pageSize) };
}
