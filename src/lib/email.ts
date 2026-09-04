import nodemailer from "nodemailer";

import type { Transporter } from "nodemailer";

const globalForEmail = globalThis as unknown as {
  emailTransporter: Transporter | null | undefined;
};

function buildTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
  });
}

function getTransporter(): Transporter | null {
  if (globalForEmail.emailTransporter === undefined) {
    globalForEmail.emailTransporter = buildTransporter();
  }
  return globalForEmail.emailTransporter;
}

export type SendEmailInput = { to: string; subject: string; text: string; html?: string };
export type SendEmailResult = { sent: boolean; error?: string };

// Never throws — callers (registration, enrollment, billing notifications) must be able to
// proceed even when SMTP isn't configured yet or a send fails; the result tells them what happened.
export async function sendEmail({ to, subject, text, html }: SendEmailInput): Promise<SendEmailResult> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`[email] SMTP is not configured — skipped "${subject}" to ${to}`);
    return { sent: false, error: "SMTP is not configured" };
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "Malhaar Dance Company <no-reply@malhaardance.example>",
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error);
    return { sent: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
