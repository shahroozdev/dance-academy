"use server";

import { sendTemplatedEmail } from "@/actions/email";
import { isPaymentReminderDue } from "@/lib/billing";
import { db } from "@/lib/db";
import { buildFeeSummary, firstName } from "@/lib/notifications";

export type SendPaymentRemindersSummary = {
  familiesReminded: number;
  familiesFailed: number;
  families: { familyId: string; familyName: string; month: string; result: "sent" | "failed"; error?: string }[];
};

type ReminderGroup = {
  familyId: string;
  familyName: string;
  parentGuardianName: string;
  email: string | null;
  month: Date;
  billingIds: string[];
  students: { name: string; finalAmountDue: number }[];
};

// Scheduled daily by /api/cron/send-payment-reminders (§5.4). Finds every UNPAID/PARTIAL bill
// whose due date (Settings.dueDayOfMonth of its month) has passed by at least
// Settings.paymentReminderDaysAfterDue days and hasn't been reminded yet, groups by family+month
// the same way the original notice does, and emails one combined reminder. A bill is marked
// `reminderSentAt` whether the send succeeds or fails (e.g. no email on file) so a family missing
// an email address doesn't produce a fresh failed log entry every single day — the failure is
// still visible once in /admin/notifications for the admin to follow up manually.
export async function sendPaymentReminders(): Promise<SendPaymentRemindersSummary> {
  const settings = await db.studioSettings.findUnique({ where: { id: "default" } });
  const dueDayOfMonth = settings?.dueDayOfMonth ?? 5;
  const reminderDaysAfterDue = settings?.paymentReminderDaysAfterDue ?? 7;
  const now = new Date();

  const candidates = await db.monthlyStudentBilling.findMany({
    where: { status: { in: ["UNPAID", "PARTIAL"] }, reminderSentAt: null },
    include: { student: { include: { family: true } } },
  });

  const eligible = candidates.filter((b) => isPaymentReminderDue(b.month, dueDayOfMonth, reminderDaysAfterDue, now));

  const groups = new Map<string, ReminderGroup>();
  for (const billing of eligible) {
    const key = `${billing.student.familyId}|${billing.month.toISOString()}`;
    const group = groups.get(key) ?? {
      familyId: billing.student.familyId,
      familyName: billing.student.family.familyName,
      parentGuardianName: billing.student.family.parentGuardianName,
      email: billing.student.family.email,
      month: billing.month,
      billingIds: [],
      students: [],
    };
    group.billingIds.push(billing.id);
    group.students.push({ name: billing.student.fullName, finalAmountDue: Number(billing.finalAmountDue) });
    groups.set(key, group);
  }

  const summary: SendPaymentRemindersSummary = { familiesReminded: 0, familiesFailed: 0, families: [] };

  for (const group of groups.values()) {
    const monthLabel = group.month.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    const vars = {
      parentName: firstName(group.parentGuardianName),
      monthLabel,
      feeSummary: buildFeeSummary(group.students),
    };

    const result = group.email
      ? await sendTemplatedEmail("PAYMENT_REMINDER", vars, group.email)
      : { sent: false, error: "No email on file", text: "" };

    await db.$transaction(async (tx) => {
      await tx.notificationLog.create({
        data: {
          familyId: group.familyId,
          month: group.month,
          channel: "EMAIL",
          status: result.sent ? "SENT" : "FAILED",
          messageContent: result.text || "(no email on file — reminder not sent)",
          sentAt: result.sent ? new Date() : null,
          errorMessage: result.error ?? null,
        },
      });
      await tx.monthlyStudentBilling.updateMany({
        where: { id: { in: group.billingIds } },
        data: { reminderSentAt: new Date() },
      });
    });

    if (result.sent) summary.familiesReminded += 1;
    else summary.familiesFailed += 1;
    summary.families.push({
      familyId: group.familyId,
      familyName: group.familyName,
      month: group.month.toISOString(),
      result: result.sent ? "sent" : "failed",
      error: result.error,
    });
  }

  return summary;
}

