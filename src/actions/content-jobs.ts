"use server";

import { requireContentOwner, requireContentUser } from "@/actions/content-access";
import { recordContentAudit, revalidatePublicSite } from "@/actions/content-service";
import { jobOpeningSchema, type JobOpeningInput } from "@/actions/content.schema";
import { idSchema } from "@/actions/validation.schema";
import { assertCanRevise, statusAfterRevision } from "@/lib/content-publishing";
import { db } from "@/lib/db";

export async function getContentJobOpenings() {
  await requireContentUser();
  return db.jobOpening.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, location: true, employmentType: true, status: true },
  });
}

export async function getContentJobOpeningById(id: string) {
  await requireContentUser();
  return db.jobOpening.findUniqueOrThrow({ where: { id: idSchema.parse(id) } });
}

const jobColumns = (data: JobOpeningInput) => ({
  title: data.title,
  location: data.location || null,
  employmentType: data.employmentType || null,
  description: data.description,
  applyUrl: data.applyUrl || null,
});

export async function createJobOpening(data: JobOpeningInput) {
  const user = await requireContentUser();
  data = jobOpeningSchema.parse(data);

  const job = await db.jobOpening.create({ data: jobColumns(data), select: { id: true } });
  await recordContentAudit(user, {
    action: "created",
    entityType: "job",
    entityId: job.id,
    summary: `Created the job opening "${data.title}" as a draft.`,
  });
  return job;
}

export async function updateJobOpening(id: string, data: JobOpeningInput) {
  const user = await requireContentUser();
  id = idSchema.parse(id);
  data = jobOpeningSchema.parse(data);

  const existing = await db.jobOpening.findUniqueOrThrow({ where: { id }, select: { status: true } });
  assertCanRevise(user.role, existing.status);
  const status = statusAfterRevision(existing.status);

  await db.jobOpening.update({ where: { id }, data: { ...jobColumns(data), status } });
  await recordContentAudit(user, {
    action: "updated",
    entityType: "job",
    entityId: id,
    summary:
      existing.status === "PUBLISHED"
        ? `Revised the job opening "${data.title}"; it returned to draft until published again.`
        : `Updated the job opening "${data.title}".`,
  });
  if (existing.status === "PUBLISHED") revalidatePublicSite(["/careers"]);
  return { id, status };
}

/** Removes an opening for good, including from the website. Content Owners only. */
export async function deleteJobOpening(id: string) {
  const owner = await requireContentOwner();
  id = idSchema.parse(id);

  const job = await db.jobOpening.delete({ where: { id }, select: { title: true } });
  await recordContentAudit(owner, {
    action: "deleted",
    entityType: "job",
    entityId: id,
    summary: `Deleted the job opening "${job.title}".`,
  });
  revalidatePublicSite(["/careers"]);
  return { id };
}
