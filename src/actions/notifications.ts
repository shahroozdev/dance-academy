"use server";
import { requireAdmin } from "@/actions/access";
import { assertFinalizedForNotification } from "@/actions/billing-service";
import { sendAdminOperationalAlert, sendParentNotificationConfirmation, sendTemplatedEmail } from "@/actions/email";
import * as notificationData from "@/actions/notification-data";
import { sendPaymentReminders } from "@/actions/reminders";
import { validateListQuery , idSchema } from "@/actions/validation.schema";
import { sendMonthlyWhatsApp } from "@/actions/whatsapp-notifications";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeMonth } from "@/lib/billing";
import { db } from "@/lib/db";
import { buildFeeSummary, firstName } from "@/lib/notifications";



export async function getFamilyNotificationPreview(familyId: string, monthInput: string) {
  await requireAdmin();
  return notificationData.getFamilyNotificationPreview(familyId, monthInput);
}



// Families with at least one bill this month whose notification hasn't gone out yet — the
// zero-cost-fallback equivalent of the doc's "Send Notifications for all Unsent" bulk action.
export async function getPendingNotifications(monthInput: string) {
  await requireAdmin();
  return notificationData.getPendingNotifications(monthInput);
}

export async function markFamilyNotificationSent(familyId: string, monthInput: string, messageContent: string) {
  await requireAdmin();
  familyId = idSchema.parse(familyId);
  const month = normalizeMonth(monthInput);
  const billings = await db.monthlyStudentBilling.findMany({ where: { month, student: { familyId } }, select: { id: true } });
  await assertFinalizedForNotification(billings.map((b) => b.id));
  // Persist server-built billing text rather than accepting arbitrary log contents from the browser.
  const preview = await notificationData.getFamilyNotificationPreview(familyId, monthInput);
  messageContent = preview.message;
  const log = await db.$transaction(async (tx) => {
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
  await sendParentNotificationConfirmation({ familyName: preview.familyName, month, channel: "Manual" });
  return log;
}

export async function sendFamilyNotificationWhatsApp(familyId: string, monthInput: string) {
  await requireAdmin();
  return sendMonthlyWhatsApp(idSchema.parse(familyId), monthInput);
}

export async function sendFamilyPaymentReminder(familyId: string, monthInput: string) {
  await requireAdmin();
  const summary = await sendPaymentReminders({ familyId: idSchema.parse(familyId), month: normalizeMonth(monthInput) });
  if (summary.familiesReminded > 0) return { sent: true };
  return { sent: false, error: summary.families[0]?.error ?? "No overdue unpaid bills are eligible for a reminder yet." };
}

export type SendFamilyNotificationEmailResult = { sent: boolean; error?: string };

// The one actually-automated send path — email requires no per-message cost or Meta approval,
// unlike WhatsApp. Logs the attempt either way, and only flips notificationStatus on success.
export async function sendFamilyNotificationEmail(
  familyId: string,
  monthInput: string,
): Promise<SendFamilyNotificationEmailResult> {
  await requireAdmin();
  familyId = idSchema.parse(familyId);
  const month = normalizeMonth(monthInput);
  const family = await db.family.findUniqueOrThrow({ where: { id: familyId } });
  if (!family.email) {
    throw new Error("This family has no email on file.");
  }
  const billings = await db.monthlyStudentBilling.findMany({ where: { month, student: { familyId } }, select: { id: true } });
  await assertFinalizedForNotification(billings.map((b) => b.id));

  const preview = await getFamilyNotificationPreview(familyId, monthInput);
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const result = await sendTemplatedEmail(
    "MONTHLY_FEE_NOTICE",
    {
      parentName: firstName(family.parentGuardianName),
      monthLabel,
      feeSummary: buildFeeSummary(preview.students),
    },
    family.email,
  );

  await db.$transaction(async (tx) => {
    await tx.notificationLog.create({
      data: {
        familyId,
        month,
        channel: "EMAIL",
        status: result.sent ? "SENT" : "FAILED",
        messageContent: result.text,
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

  if (result.sent) {
    await sendParentNotificationConfirmation({ familyName: family.familyName, month, channel: "Email" });
  } else {
    await sendAdminOperationalAlert({
      setting: "parentNotificationFailureAlertEnabled",
      subject: `Parent fee notification failed — ${family.familyName}`,
      lines: [`Family: ${family.familyName}`, `Billing month: ${monthLabel}`, "Delivery method: Email", `Error: ${result.error ?? "Unknown error"}`],
    });
  }

  return result;
}

export type AdminNotificationSummary = {
  pendingRegistrations: number;
  pendingFamilyNotifications: number;
  failedNotifications: number;
  total: number;
};

const FAILED_NOTIFICATION_WINDOW_DAYS = 30;

// Powers the admin header's notification bell. These are three "needs your attention" counts,
// not a persisted read/unread inbox — each one self-resolves through normal use (approving a
// registration, sending a notification) rather than a separate "mark as read" action. Failed
// sends are windowed to the last 30 days so an old, already-handled failure doesn't sit in the
// count forever with no way to clear it.
export async function getAdminNotificationSummary(): Promise<AdminNotificationSummary> {
  await requireAdmin();
  const failedSince = new Date();
  failedSince.setDate(failedSince.getDate() - FAILED_NOTIFICATION_WINDOW_DAYS);

  const [pendingRegistrations, pendingFamilies, failedNotifications] = await Promise.all([
    db.registrationRequest.count({ where: { status: "PENDING" } }),
    getPendingNotifications(new Date().toISOString()),
    db.notificationLog.count({ where: { status: "FAILED", createdAt: { gte: failedSince } } }),
  ]);

  const pendingFamilyNotifications = pendingFamilies.length;

  return {
    pendingRegistrations,
    pendingFamilyNotifications,
    failedNotifications,
    total: pendingRegistrations + pendingFamilyNotifications + failedNotifications,
  };
}

export async function getNotificationLogs(params?: {
  familyId?: string;
  month?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();
  validateListQuery(params, []);
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
