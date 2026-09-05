"use server";

import { decryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { sendEmail, type SendEmailResult } from "@/lib/email";
import { wrapEmailHtml } from "@/lib/email-html";
import { EMAIL_TEMPLATES, renderEmailTemplate, type EmailTemplateKeyValue } from "@/lib/email-templates";

export type SendTemplatedEmailResult = SendEmailResult & { subject: string; text: string };

// Resolves the admin-editable template for `key` (or its default, if never customized) and the
// studio's SMTP/branding settings, renders the template with `vars`, wraps it in the fixed
// header/footer HTML shell (@/lib/email-html — theme color + logo, not admin-editable), and
// sends it. Degrades gracefully — logs a warning and skips the send — when SMTP isn't
// configured, so callers (registration, enrollment, billing notifications) never fail because of it.
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
  const html = wrapEmailHtml({
    studioName,
    logoUrl: settings?.logoUrl ?? null,
    primaryColor: settings?.primaryColor || "#9B1B5E",
    bodyText: text,
  });

  if (!settings?.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
    console.warn(`[email] SMTP is not configured — skipped "${subject}" to ${to}`);
    return { sent: false, error: "SMTP is not configured", subject, text };
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
      password: decryptSecret(settings.smtpPassword),
      from: settings.emailFrom || "Malhaar Dance Company <no-reply@malhaardance.example>",
    },
  });

  return { ...result, subject, text };
}
