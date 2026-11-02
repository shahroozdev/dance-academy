"use server";

import { z } from "zod";

import { requireContentOwner, requireContentUser } from "@/actions/content-access";
import { recordContentAudit } from "@/actions/content-service";
import { GENERAL_APPLICATION, INQUIRY_INTERESTS, JOB_APPLICATION_TOPIC } from "@/actions/inquiries.schema";
import { idSchema } from "@/actions/validation.schema";
import type { Prisma } from "@/generated/prisma/client";
import { deletePrivateDocument, privateDocumentUrl } from "@/lib/cloudinary";
import { db } from "@/lib/db";

// Website inquiries, read and handled in the Content Portal by owners and editors alike. They
// hold visitors' contact details, so every function checks the content session first, and the
// fingerprint used for rate limiting is never sent to the browser.

const INQUIRY_STATUSES = ["NEW", "READ", "REPLIED", "ARCHIVED"] as const;
type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

const inquiryColumns = {
  id: true,
  name: true,
  email: true,
  phone: true,
  studentName: true,
  studentAge: true,
  interestedIn: true,
  preferredLocation: true,
  message: true,
  jobTitle: true,
  experience: true,
  availability: true,
  resumeName: true,
  status: true,
  emailAlertSent: true,
  handledByName: true,
  createdAt: true,
} as const satisfies Prisma.InquirySelect;

const listQuerySchema = z
  .object({
    // "OPEN" is everything not archived, which is what the list shows by default.
    status: z.enum([...INQUIRY_STATUSES, "OPEN"]).optional(),
    // Contact-form messages and job applications share the table but are listed separately.
    kind: z.enum(["inquiries", "applications"]).optional(),
    interest: z.enum(INQUIRY_INTERESTS).optional(),
    // An opening's id, or GENERAL_APPLICATION for applications not tied to one.
    position: z.string().max(100).optional(),
    search: z.string().trim().max(200).optional(),
    page: z.number().int().min(1).max(100000).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  })
  .strict();

type InquiryListQuery = z.infer<typeof listQuerySchema>;

export async function getContentInquiries(params?: InquiryListQuery) {
  await requireContentUser();
  const { status = "OPEN", kind = "inquiries", interest, position, search, page = 1, pageSize = 20 } = listQuerySchema.parse(
    params ?? {},
  );

  const topic: Prisma.InquiryWhereInput =
    kind === "applications"
      ? {
          interestedIn: JOB_APPLICATION_TOPIC,
          ...(position && { jobOpeningId: position === GENERAL_APPLICATION ? null : position }),
        }
      : { interestedIn: interest ?? { not: JOB_APPLICATION_TOPIC } };

  const where: Prisma.InquiryWhereInput = {
    ...topic,
    status: status === "OPEN" ? { not: "ARCHIVED" } : status,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    db.inquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: inquiryColumns,
    }),
    db.inquiry.count({ where }),
  ]);
  return { data, total, pages: Math.ceil(total / pageSize) };
}

/** What the bell in the portal's header shows: how many inquiries are new, and the latest few. */
export async function getContentInquirySummary() {
  await requireContentUser();
  const [newCount, latest] = await Promise.all([
    db.inquiry.count({ where: { status: "NEW" } }),
    db.inquiry.findMany({
      where: { status: "NEW" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, interestedIn: true, createdAt: true },
    }),
  ]);
  return { newCount, latest };
}

/** Marks an inquiry as read, replied to, or archived — or puts it back to new. */
export async function setInquiryStatus(id: string, status: InquiryStatus) {
  const user = await requireContentUser();
  id = idSchema.parse(id);
  status = z.enum(INQUIRY_STATUSES).parse(status);

  return db.inquiry.update({
    where: { id },
    data: { status, handledByName: status === "NEW" ? null : user.name },
    select: inquiryColumns,
  });
}

const findApplication = (id: string) =>
  db.inquiry.findFirstOrThrow({
    where: { id: idSchema.parse(id), interestedIn: JOB_APPLICATION_TOPIC },
    select: { name: true, resumePublicId: true },
  });

/** A link that opens an applicant's resume for the next few minutes. */
export async function getJobApplicationResumeUrl(id: string) {
  await requireContentUser();
  const { resumePublicId } = await findApplication(id);
  if (!resumePublicId) throw new Error("This application has no resume.");
  return privateDocumentUrl(resumePublicId);
}

/** Removes a job application and its resume for good. Content Owners only. */
export async function deleteJobApplication(id: string) {
  const owner = await requireContentOwner();
  id = idSchema.parse(id);
  const application = await findApplication(id);

  await db.inquiry.delete({ where: { id } });
  if (application.resumePublicId) {
    // The record is already gone, so a failure here only leaves an unreachable private file.
    await deletePrivateDocument(application.resumePublicId).catch((error: unknown) =>
      console.error("[content] A deleted application's resume could not be removed:", error instanceof Error ? error.message : error),
    );
  }
  await recordContentAudit(owner, {
    action: "deleted",
    entityType: "job-application",
    entityId: id,
    summary: `Deleted the job application from ${application.name}.`,
  });
  return { id };
}
