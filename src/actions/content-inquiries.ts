"use server";

import { z } from "zod";

import { requireContentUser } from "@/actions/content-access";
import { INQUIRY_INTERESTS } from "@/actions/inquiries.schema";
import { idSchema } from "@/actions/validation.schema";
import type { Prisma } from "@/generated/prisma/client";
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
  status: true,
  emailAlertSent: true,
  handledByName: true,
  createdAt: true,
} as const satisfies Prisma.InquirySelect;

const listQuerySchema = z
  .object({
    // "OPEN" is everything not archived, which is what the list shows by default.
    status: z.enum([...INQUIRY_STATUSES, "OPEN"]).optional(),
    interest: z.enum(INQUIRY_INTERESTS).optional(),
    search: z.string().trim().max(200).optional(),
    page: z.number().int().min(1).max(100000).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  })
  .strict();

type InquiryListQuery = z.infer<typeof listQuerySchema>;

export async function getContentInquiries(params?: InquiryListQuery) {
  await requireContentUser();
  const { status = "OPEN", interest, search, page = 1, pageSize = 20 } = listQuerySchema.parse(params ?? {});

  const where: Prisma.InquiryWhereInput = {
    status: status === "OPEN" ? { not: "ARCHIVED" } : status,
    ...(interest && { interestedIn: interest }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
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
