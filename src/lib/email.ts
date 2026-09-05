import nodemailer from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  smtp: SmtpConfig;
};
export type SendEmailResult = { sent: boolean; error?: string };

// Never throws — callers (registration, enrollment, billing notifications) must be able to
// proceed even when a send fails; the result tells them what happened. Callers resolve `smtp`
// from StudioSettings themselves (see @/actions/email) since Prisma access is actions-only.
export async function sendEmail({ to, subject, text, html, smtp }: SendEmailInput): Promise<SendEmailResult> {
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.password },
  });

  try {
    await transporter.sendMail({ from: smtp.from, to, subject, text, html });
    return { sent: true };
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error);
    return { sent: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
