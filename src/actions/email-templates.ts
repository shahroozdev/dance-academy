"use server";

import type { EmailTemplateUpdateInput } from "@/actions/email-templates.schema";
import { emailTemplateUpdateSchema } from "@/actions/email-templates.schema";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { EMAIL_TEMPLATE_KEYS, EMAIL_TEMPLATES, type EmailTemplateKeyValue } from "@/lib/email-templates";

export type EmailTemplateData = {
  key: EmailTemplateKeyValue;
  subject: string;
  body: string;
  updatedAt: Date;
};

async function requireOwner() {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    throw new Error("Only the studio owner can manage email templates.");
  }
  return session;
}

// ---------- Queries ----------

// Lazily seeds any of the 4 fixed template rows that don't exist yet with their defaults — same
// get-or-create shape as getStudioSettings, so a studio that never opens this settings tab still
// sends the same emails it always did.
export async function getEmailTemplates(): Promise<EmailTemplateData[]> {
  const existing = await db.emailTemplate.findMany();
  const byKey = new Map(existing.map((t) => [t.key, t]));

  const results: EmailTemplateData[] = [];
  for (const key of EMAIL_TEMPLATE_KEYS) {
    const row = byKey.get(key);
    if (row) {
      results.push(row);
      continue;
    }
    const meta = EMAIL_TEMPLATES[key];
    const created = await db.emailTemplate.create({
      data: { key, subject: meta.defaultSubject, body: meta.defaultBody },
    });
    results.push(created);
  }
  return results;
}

// ---------- Mutations ----------

export async function updateEmailTemplate(
  key: EmailTemplateKeyValue,
  input: EmailTemplateUpdateInput,
): Promise<EmailTemplateData> {
  await requireOwner();
  const data = emailTemplateUpdateSchema.parse(input);

  return db.emailTemplate.upsert({
    where: { key },
    create: { key, ...data },
    update: data,
  });
}
