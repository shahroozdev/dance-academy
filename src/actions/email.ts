"use server";

import { decryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { sendEmail, type SendEmailResult } from "@/lib/email";

export type SendStudioEmailInput = { to: string; subject: string; text: string; html?: string };

// Resolves SMTP config from StudioSettings (admin-editable, see /admin/settings) and sends
// through it. Degrades gracefully — logs a warning and skips the send — when SMTP isn't
// configured, rather than failing whatever triggered it.
export async function sendStudioEmail(input: SendStudioEmailInput): Promise<SendEmailResult> {
  const settings = await db.studioSettings.findUnique({ where: { id: "default" } });
  if (!settings?.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
    console.warn(`[email] SMTP is not configured — skipped "${input.subject}" to ${input.to}`);
    return { sent: false, error: "SMTP is not configured" };
  }

  const port = settings.smtpPort ?? 587;
  return sendEmail({
    ...input,
    smtp: {
      host: settings.smtpHost,
      port,
      secure: settings.smtpSecure || port === 465,
      user: settings.smtpUser,
      password: decryptSecret(settings.smtpPassword),
      from: settings.emailFrom || "Malhaar Dance Company <no-reply@malhaardance.example>",
    },
  });
}
