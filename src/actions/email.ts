import "server-only";

import type { StudioSettings } from "@/generated/prisma/client";
import { decryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { sendEmail, type SendEmailResult } from "@/lib/email";
import { wrapEmailHtml } from "@/lib/email-html";
import { EMAIL_TEMPLATES, renderEmailTemplate, type EmailTemplateKeyValue } from "@/lib/email-templates";

export type SendTemplatedEmailResult = SendEmailResult & { subject: string; text: string };

async function deliverStudioEmail(
  settings: StudioSettings | null,
  to: string,
  subject: string,
  text: string,
): Promise<SendTemplatedEmailResult> {
  const studioName = settings?.studioName || "Malhaar Dance Company";
  const appUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const html = wrapEmailHtml({
    studioName,
    logoUrl: settings?.logoUrl ?? `${appUrl}/images/malhaar_dance_logo.png`,
    primaryColor: settings?.primaryColor || "#9B1B5E",
    bodyText: text,
  });

  if (!settings?.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
    console.warn(`[email] SMTP is not configured — skipped "${subject}" to ${to}`);
    return { sent: false, error: "SMTP is not configured", subject, text };
  }

  let password: string;
  try {
    password = decryptSecret(settings.smtpPassword);
  } catch {
    return { sent: false, error: "Email credentials could not be read. Re-save the SMTP password in Settings.", subject, text };
  }

  const port = settings.smtpPort ?? 587;
  const result = await sendEmail({
    to,
    subject,
    text,
    html,
    smtp: {
      host: settings.smtpHost,
      port,
      secure: settings.smtpSecure || port === 465,
      user: settings.smtpUser,
      password,
      from: settings.emailFrom || "Malhaar Dance Company <no-reply@malhaardance.example>",
    },
  });
  return { ...result, subject, text };
}

export async function sendTemplatedEmail(
  key: EmailTemplateKeyValue,
  vars: Record<string, string>,
  to: string,
): Promise<SendTemplatedEmailResult> {
  const [settings, templateRow] = await Promise.all([
    db.studioSettings.findUnique({ where: { id: "default" } }),
    db.emailTemplate.findUnique({ where: { key } }),
  ]);
  const studioName = settings?.studioName || "Malhaar Dance Company";
  const meta = EMAIL_TEMPLATES[key];
  const template = templateRow ?? { subject: meta.defaultSubject, body: meta.defaultBody };
  const { subject, text } = renderEmailTemplate(template, { ...vars, studioName });
  return deliverStudioEmail(settings, to, subject, text);
}

export async function sendBillingReadyAlert(
  month: Date,
  summary: { created: number; updated: number; skipped: number },
): Promise<SendTemplatedEmailResult & { skippedBySetting?: boolean; recipient?: string }> {
  const settings = await db.studioSettings.findUnique({ where: { id: "default" } });
  if (settings && !settings.billingAlertEnabled) {
    return { sent: false, skippedBySetting: true, subject: "", text: "" };
  }

  const fallbackOwner = settings?.billingAlertEmail
    ? null
    : await db.adminUser.findFirst({
        where: { role: "OWNER", isActive: true },
        orderBy: { createdAt: "asc" },
        select: { email: true },
      });
  const recipient = settings?.billingAlertEmail || fallbackOwner?.email;
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const subject = `${monthLabel} bills are ready for review`;
  const text = [
    `${monthLabel} billing has finished.`,
    "",
    `${summary.created} bills created, ${summary.updated} updated, and ${summary.skipped} skipped because they already have payments.`,
    "",
    "Review the billable session counts on Class Fees, make any corrections, and finalize them before notifying parents.",
  ].join("\n");

  if (!recipient) return { sent: false, error: "No billing alert email is configured", subject, text };
  return { ...(await deliverStudioEmail(settings, recipient, subject, text)), recipient };
}

export async function sendParentNotificationConfirmation(input: {
  familyName: string;
  month: Date;
  channel: "Email" | "WhatsApp" | "Manual";
}): Promise<SendTemplatedEmailResult & { skippedBySetting?: boolean; recipient?: string }> {
  try {
    const settings = await db.studioSettings.findUnique({ where: { id: "default" } });
    if (settings && !settings.parentNotificationAlertEnabled) {
      return { sent: false, skippedBySetting: true, subject: "", text: "" };
    }

    const fallbackOwner = settings?.billingAlertEmail
      ? null
      : await db.adminUser.findFirst({
          where: { role: "OWNER", isActive: true },
          orderBy: { createdAt: "asc" },
          select: { email: true },
        });
    const recipient = settings?.billingAlertEmail || fallbackOwner?.email;
    const monthLabel = input.month.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    const subject = `✓ Parent fee notification sent — ${input.familyName}`;
    const text = [
      "✓ Parent fee notification sent successfully.",
      "",
      `Family: ${input.familyName}`,
      `Billing month: ${monthLabel}`,
      `Delivery method: ${input.channel}`,
    ].join("\n");

    if (!recipient) return { sent: false, error: "No admin alert email is configured", subject, text };
    return { ...(await deliverStudioEmail(settings, recipient, subject, text)), recipient };
  } catch (error) {
    console.error("[email] Could not send the parent-notification confirmation:", error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Unknown error",
      subject: "",
      text: "",
    };
  }
}

type OperationalAlertSetting =
  | "registrationAlertEnabled"
  | "paymentRecordedAlertEnabled"
  | "creditAlertEnabled"
  | "billingFailureAlertEnabled"
  | "parentNotificationFailureAlertEnabled"
  | "paymentReminderFailureAlertEnabled"
  | "unfinalizedFeeAlertEnabled";

export async function sendAdminOperationalAlert(input: {
  setting: OperationalAlertSetting;
  subject: string;
  lines: string[];
}): Promise<SendTemplatedEmailResult & { skippedBySetting?: boolean; recipient?: string }> {
  try {
    const settings = await db.studioSettings.findUnique({ where: { id: "default" } });
    if (settings && !settings[input.setting]) return { sent: false, skippedBySetting: true, subject: "", text: "" };
    const owner = settings?.billingAlertEmail ? null : await db.adminUser.findFirst({
      where: { role: "OWNER", isActive: true }, orderBy: { createdAt: "asc" }, select: { email: true },
    });
    const recipient = settings?.billingAlertEmail || owner?.email;
    const text = input.lines.join("\n");
    if (!recipient) return { sent: false, error: "No admin alert email is configured", subject: input.subject, text };
    return { ...(await deliverStudioEmail(settings, recipient, input.subject, text)), recipient };
  } catch (error) {
    console.error(`[email] Could not send admin alert "${input.subject}":`, error);
    return { sent: false, error: error instanceof Error ? error.message : "Unknown error", subject: input.subject, text: input.lines.join("\n") };
  }
}

export async function sendUnfinalizedFeeReminder(month: Date) {
  const settings = await db.studioSettings.findUnique({ where: { id: "default" } });
  if (settings && !settings.unfinalizedFeeAlertEnabled) return { sent: false, skippedBySetting: true };
  if (new Date().getUTCDate() < (settings?.dueDayOfMonth ?? 5)) return { sent: false, notDue: true };
  if (settings?.lastUnfinalizedFeeAlertMonth?.getTime() === month.getTime()) return { sent: false, alreadySent: true };
  const fees = await db.classMonthlyFee.findMany({
    where: { month, isFinalized: false }, select: { class: { select: { name: true } } },
  });
  if (fees.length === 0) return { sent: false, nothingPending: true };
  const result = await sendAdminOperationalAlert({
    setting: "unfinalizedFeeAlertEnabled",
    subject: "Class fees still need finalization",
    lines: ["The following class fees must be reviewed before parent notices can be sent:", "", ...fees.map((fee) => `• ${fee.class.name}`)],
  });
  if (result.sent) await db.studioSettings.update({ where: { id: "default" }, data: { lastUnfinalizedFeeAlertMonth: month } });
  return result;
}
