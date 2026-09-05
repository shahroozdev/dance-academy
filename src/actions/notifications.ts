"use server";

import { sendStudioEmail } from "@/actions/email";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeMonth, round2 } from "@/lib/billing";
import { db } from "@/lib/db";
import { buildFamilyMessage, buildWhatsAppLink } from "@/lib/notifications";

export type FamilyNotificationPreview = {
  familyId: string;
  familyName: string;
  parentGuardianName: string;
  phone: string;
  email: string | null;
  month: string;
  students: { billingId: string; name: string; finalAmountDue: number }[];
  total: number;
  message: string;
  waLink: string;
  alreadySent: boolean;
};

export async function getFamilyNotificationPreview(
  familyId: string,
  monthInput: string,
): Promise<FamilyNotificationPreview> {
  const month = normalizeMonth(monthInput);
  const family = await db.family.findUniqueOrThrow({ where: { id: familyId } });
  const billings = await db.monthlyStudentBilling.findMany({
    where: { month, student: { familyId } },
    include: { student: true },
    orderBy: { student: { fullName: "asc" } },
  });
  if (billings.length === 0) {
    throw new Error("No bills found for this family in this month.");
  }

  const students = billings.map((b) => ({
    billingId: b.id,
    name: b.student.fullName,
    finalAmountDue: Number(b.finalAmountDue),
  }));
  const total = round2(students.reduce((sum, s) => sum + s.finalAmountDue, 0));
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  const message = buildFamilyMessage({ parentGuardianName: family.parentGuardianName, monthLabel, students });

  return {
    familyId,
    familyName: family.familyName,
    parentGuardianName: family.parentGuardianName,
    phone: family.phone,
    email: family.email,
    month: month.toISOString(),
    students,
    total,
    message,
    waLink: buildWhatsAppLink(family.phone, message),
    alreadySent: billings.every((b) => b.notificationStatus === "SENT"),
  };
}

export type PendingFamilyNotification = {
  familyId: string;
  familyName: string;
  studentCount: number;
  total: number;
};

// Families with at least one bill this month whose notification hasn't gone out yet — the
// zero-cost-fallback equivalent of the doc's "Send Notifications for all Unsent" bulk action.
export async function getPendingNotifications(monthInput: string): Promise<PendingFamilyNotification[]> {
  const month = normalizeMonth(monthInput);
  const billings = await db.monthlyStudentBilling.findMany({
    where: { month, notificationStatus: { not: "SENT" } },
    include: { student: { include: { family: true } } },
  });

  const byFamily = new Map<string, { familyName: string; total: number; count: number }>();
  for (const b of billings) {
    const key = b.student.familyId;
    const entry = byFamily.get(key) ?? { familyName: b.student.family.familyName, total: 0, count: 0 };
    entry.total = round2(entry.total + Number(b.finalAmountDue));
    entry.count += 1;
    byFamily.set(key, entry);
  }

  return [...byFamily.entries()]
    .map(([familyId, v]) => ({ familyId, familyName: v.familyName, studentCount: v.count, total: v.total }))
    .sort((a, b) => a.familyName.localeCompare(b.familyName));
}

export async function markFamilyNotificationSent(familyId: string, monthInput: string, messageContent: string) {
  const month = normalizeMonth(monthInput);
  return db.$transaction(async (tx) => {
    const log = await tx.notificationLog.create({
      data: {
        familyId,
        month,
        channel: "MANUAL",
        status: "SENT",
        messageContent,
        sentAt: new Date(),
      },
    });
    await tx.monthlyStudentBilling.updateMany({
      where: { month, student: { familyId } },
      data: { notificationStatus: "SENT", notificationSentAt: new Date() },
    });
    return log;
  });
}

export type SendFamilyNotificationEmailResult = { sent: boolean; error?: string };

// The one actually-automated send path — email requires no per-message cost or Meta approval,
// unlike WhatsApp. Logs the attempt either way, and only flips notificationStatus on success.
export async function sendFamilyNotificationEmail(
  familyId: string,
  monthInput: string,
): Promise<SendFamilyNotificationEmailResult> {
  const month = normalizeMonth(monthInput);
  const family = await db.family.findUniqueOrThrow({ where: { id: familyId } });
  if (!family.email) {
    throw new Error("This family has no email on file.");
  }

  const preview = await getFamilyNotificationPreview(familyId, monthInput);
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const result = await sendStudioEmail({
    to: family.email,
    subject: `${monthLabel} Dance Fees — Malhaar Dance Company`,
    text: preview.message,
  });

  await db.$transaction(async (tx) => {
    await tx.notificationLog.create({
      data: {
        familyId,
        month,
        channel: "EMAIL",
        status: result.sent ? "SENT" : "FAILED",
        messageContent: preview.message,
        sentAt: result.sent ? new Date() : null,
        errorMessage: result.error ?? null,
      },
    });
    if (result.sent) {
      await tx.monthlyStudentBilling.updateMany({
        where: { month, student: { familyId } },
        data: { notificationStatus: "SENT", notificationSentAt: new Date() },
      });
    }
  });

  return result;
}

export async function getNotificationLogs(params?: {
  familyId?: string;
  month?: string;
  page?: number;
  pageSize?: number;
}) {
  const { familyId, month, page = 1, pageSize = 50 } = params ?? {};

  const where: Prisma.NotificationLogWhereInput = {};
  if (familyId) where.familyId = familyId;
  if (month) where.month = normalizeMonth(month);

  const [logs, total] = await Promise.all([
    db.notificationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.notificationLog.count({ where }),
  ]);

  // NotificationLog.familyId is a plain id, not a Prisma relation, so family names are resolved
  // with a small secondary lookup rather than an `include`.
  const familyIds = [...new Set(logs.map((l) => l.familyId))];
  const families = await db.family.findMany({
    where: { id: { in: familyIds } },
    select: { id: true, familyName: true },
  });
  const familyNameById = new Map(families.map((f) => [f.id, f.familyName]));

  return {
    data: logs.map((l) => ({ ...l, familyName: familyNameById.get(l.familyId) ?? "Unknown family" })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}
