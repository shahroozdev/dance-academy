import "server-only";

import { assertFinalizedForNotification, getUnfinalizedBillingIds } from "@/actions/billing-service";
import { sendAdminOperationalAlert, sendTemplatedEmail } from "@/actions/email";
import { sendConfiguredWhatsApp } from "@/actions/whatsapp";
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
  phone: string;
  month: Date;
  billingIds: string[];
  students: { name: string; finalAmountDue: number }[];
};

// Scheduled daily by /api/cron/send-payment-reminders (§5.4). Finds every UNPAID/PARTIAL bill
// whose due date (Settings.dueDayOfMonth of its month) has passed by at least
// Settings.paymentReminderDaysAfterDue days and hasn't been reminded yet, groups by family+month
// the same way the original notice does. Only successful sends set reminderSentAt; failed
// attempts remain eligible on the next daily run after credentials/contact details are fixed.
export async function sendPaymentReminders(retry?: { familyId: string; month: Date }): Promise<SendPaymentRemindersSummary> {
  const settings = await db.studioSettings.findUnique({ where: { id: "default" } });
  const dueDayOfMonth = settings?.dueDayOfMonth ?? 5;
  const reminderDaysAfterDue = settings?.paymentReminderDaysAfterDue ?? 7;
  const now = new Date();

  const candidates = await db.monthlyStudentBilling.findMany({
    where: {
      status: { in: ["UNPAID", "PARTIAL"] },
      ...(retry ? { student: { familyId: retry.familyId }, month: retry.month } : { reminderSentAt: null }),
    },
    include: { student: { include: { family: true } } },
  });

  const dueBills = candidates.filter((b) => isPaymentReminderDue(b.month, dueDayOfMonth, reminderDaysAfterDue, now));

  let eligible = dueBills;
  if (retry) {
    // A manual, family-specific retry should fail loudly if its billing period isn't finalized.
    await assertFinalizedForNotification(dueBills.map((b) => b.id));
  } else {
    // The scheduled bulk run silently skips not-yet-finalized bills — they stay eligible
    // (reminderSentAt is untouched) and get reminded automatically once finalized.
    const unfinalizedIds = await getUnfinalizedBillingIds(dueBills.map((b) => b.id));
    eligible = dueBills.filter((b) => !unfinalizedIds.has(b.id));
  }

  const groups = new Map<string, ReminderGroup>();
  for (const billing of eligible) {
    const key = `${billing.student.familyId}|${billing.month.toISOString()}`;
    const group = groups.get(key) ?? {
      familyId: billing.student.familyId,
      familyName: billing.student.family.familyName,
      parentGuardianName: billing.student.family.parentGuardianName,
      email: billing.student.family.email,
      phone: billing.student.family.phone,
      month: billing.month,
      billingIds: [],
      students: [],
    };
    group.billingIds.push(billing.id);
    group.students.push({ name: billing.student.fullName, finalAmountDue: Number(billing.balance) });
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

    const channel = process.env.WHATSAPP_AUTOMATION_ENABLED === "true" ? "WHATSAPP" : "EMAIL";
    const senders = {
      WHATSAPP: async () => ({
        ...await sendConfiguredWhatsApp(group.phone, "payment_reminder", [vars.parentName, monthLabel, vars.feeSummary]),
        text: `Payment reminder for ${monthLabel}: ${vars.feeSummary}`,
      }),
      EMAIL: async () => group.email
        ? await sendTemplatedEmail("PAYMENT_REMINDER", vars, group.email)
        : { sent: false, error: "No email on file", text: "", providerMessageId: undefined },
    };
    const result = await senders[channel]();

    await db.$transaction(async (tx) => {
      await tx.notificationLog.create({
        data: {
          familyId: group.familyId,
          month: group.month,
          channel,
          status: result.sent ? "SENT" : "FAILED",
          messageContent: result.text || "(no email on file — reminder not sent)",
          sentAt: result.sent ? new Date() : null,
          errorMessage: result.error ?? null,
          providerMessageId: "providerMessageId" in result ? result.providerMessageId : null,
        },
      });
      if (result.sent) {await tx.monthlyStudentBilling.updateMany({
        where: { id: { in: group.billingIds } },
        data: { reminderSentAt: new Date() },
      });}
    });

    if (result.sent) summary.familiesReminded += 1;
    else {
      summary.familiesFailed += 1;
      await sendAdminOperationalAlert({
        setting: "paymentReminderFailureAlertEnabled",
        subject: `Payment reminder failed — ${group.familyName}`,
        lines: [`Family: ${group.familyName}`, `Billing month: ${monthLabel}`, `Delivery method: ${channel}`, `Error: ${result.error ?? "Unknown error"}`],
      });
    }
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
