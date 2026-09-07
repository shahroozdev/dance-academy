import "server-only";

import { getFamilyNotificationPreview, getPendingNotifications } from "@/actions/notification-data";
import { sendConfiguredWhatsApp } from "@/actions/whatsapp";
import { normalizeMonth } from "@/lib/billing";
import { db } from "@/lib/db";
import { buildFeeSummary, firstName } from "@/lib/notifications";

export async function sendMonthlyWhatsApp(familyId: string, monthInput: string) {
  const month = normalizeMonth(monthInput);
  const preview = await getFamilyNotificationPreview(familyId, monthInput);
  if (!preview.finalized) {
    throw new Error(
      `Finalize this month's billable session count for ${preview.unfinalizedClassNames.join(", ")} on the Class Monthly Fees page before sending.`,
    );
  }
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const result = await sendConfiguredWhatsApp(preview.phone, "monthly_fee_notice", [
    firstName(preview.parentGuardianName), monthLabel, buildFeeSummary(preview.students),
  ]);
  await db.$transaction(async tx => {
    await tx.notificationLog.create({ data: {
      familyId, month, channel: "WHATSAPP", status: result.sent ? "SENT" : "FAILED",
      messageContent: preview.message, providerMessageId: result.providerMessageId ?? null,
      sentAt: result.sent ? new Date() : null, errorMessage: result.error ?? null,
    } });
    if (result.sent) {await tx.monthlyStudentBilling.updateMany({
      where: { id: { in: preview.students.map(s => s.billingId) } },
      data: { notificationStatus: "SENT", notificationSentAt: new Date() },
    });}
  });
  return result;
}

export async function sendPendingWhatsAppNotifications(month: string) {
  if (process.env.WHATSAPP_AUTOMATION_ENABLED !== "true") return { sent: 0, failed: 0 };
  const pending = await getPendingNotifications(month);
  const summary = { sent: 0, failed: 0 };
  for (const family of pending) {
    // Not-yet-finalized families are silently skipped, not counted as failed — they stay
    // pending and are picked up automatically once their class fees are finalized.
    const preview = await getFamilyNotificationPreview(family.familyId, month);
    if (!preview.finalized) continue;
    const result = await sendMonthlyWhatsApp(family.familyId, month);
    if (result.sent) summary.sent++;
    else summary.failed++;
  }
  return summary;
}
