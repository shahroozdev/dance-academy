"use server";

import { put } from "@vercel/blob";

import { requireAdmin, requireOwner } from "@/actions/access";
import {
  registrationPolicySettingsSchema,
  studioSettingsUpdateSchema,
  type RegistrationPolicySettingsInput,
  type StudioSettingsUpdateInput,
} from "@/actions/settings.schema";
import type { StudioSettings } from "@/generated/prisma/client";
import { encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import {
  DEFAULT_REGISTRATION_AGREEMENT_LABEL,
  DEFAULT_REGISTRATION_POLICY_CONTENT,
  DEFAULT_REGISTRATION_POLICY_TITLE,
} from "@/lib/registration-policy";

// ---------- Types ----------

// smtpPassword/whatsappAccessToken are secrets — never sent to the client. Callers get a
// `*Set` boolean instead so the UI can show "configured" without exposing the value.
export type StudioSettingsData = {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontSize: "SMALL" | "MEDIUM" | "LARGE";
  logoUrl: string | null;
  studioName: string | null;
  registrationPolicyTitle: string;
  registrationPolicyContent: string;
  registrationPolicyAgreementLabel: string;
  registrationPolicyVersion: number;

  multiClassDiscountPct: number;
  siblingDiscountPct: number;

  dueDayOfMonth: number;
  paymentReminderDaysAfterDue: number;
  billingAlertEnabled: boolean;
  billingAlertEmail: string | null;
  parentNotificationAlertEnabled: boolean;
  registrationAlertEnabled: boolean;
  paymentRecordedAlertEnabled: boolean;
  creditAlertEnabled: boolean;
  billingFailureAlertEnabled: boolean;
  parentNotificationFailureAlertEnabled: boolean;
  paymentReminderFailureAlertEnabled: boolean;
  unfinalizedFeeAlertEnabled: boolean;

  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPasswordSet: boolean;
  emailFrom: string | null;

  whatsappPhoneNumberId: string | null;
  whatsappBusinessAccountId: string | null;
  whatsappAccessTokenSet: boolean;
};

const DEFAULT_SETTINGS = {
  id: "default",
  primaryColor: "#9B1B5E",
  secondaryColor: "#F5D0E0",
  accentColor: "#E8A0D0",
  fontSize: "MEDIUM" as const,
  logoUrl: null,
  studioName: "Malhaar Dance Company",
  registrationPolicyTitle: DEFAULT_REGISTRATION_POLICY_TITLE,
  registrationPolicyContent: DEFAULT_REGISTRATION_POLICY_CONTENT,
  registrationPolicyAgreementLabel: DEFAULT_REGISTRATION_AGREEMENT_LABEL,
  registrationPolicyVersion: 1,
};

function toClientSettings(settings: StudioSettings): StudioSettingsData {
  const { smtpPassword, whatsappAccessToken, ...rest } = settings;
  return {
    ...rest,
    multiClassDiscountPct: Number(settings.multiClassDiscountPct),
    siblingDiscountPct: Number(settings.siblingDiscountPct),
    smtpPasswordSet: !!smtpPassword,
    whatsappAccessTokenSet: !!whatsappAccessToken,
  };
}

// Blank secret fields mean "keep the stored value" — drop them so an update never overwrites a
// configured secret with an empty string. A non-blank value is encrypted before it touches the
// DB, so a dump/backup of StudioSettings alone never exposes the plaintext SMTP password or
// WhatsApp access token.
function prepareSecretsForStorage(data: StudioSettingsUpdateInput): StudioSettingsUpdateInput {
  const cleaned = { ...data };
  if (cleaned.smtpPassword === "") delete cleaned.smtpPassword;
  else if (cleaned.smtpPassword !== undefined) cleaned.smtpPassword = encryptSecret(cleaned.smtpPassword);

  if (cleaned.whatsappAccessToken === "") delete cleaned.whatsappAccessToken;
  else if (cleaned.whatsappAccessToken !== undefined) cleaned.whatsappAccessToken = encryptSecret(cleaned.whatsappAccessToken);

  return cleaned;
}

// ---------- Queries ----------

export async function getStudioSettings(): Promise<StudioSettingsData> {
  await requireAdmin();
  const existing = await db.studioSettings.findUnique({ where: { id: "default" } });
  if (existing) return toClientSettings(existing);

  const created = await db.studioSettings.create({ data: DEFAULT_SETTINGS });
  return toClientSettings(created);
}

export type PublicRegistrationPolicy = Pick<
  StudioSettingsData,
  | "registrationPolicyTitle"
  | "registrationPolicyContent"
  | "registrationPolicyAgreementLabel"
  | "registrationPolicyVersion"
>;

export async function getPublicRegistrationPolicy(): Promise<PublicRegistrationPolicy> {
  const settings = await db.studioSettings.findUnique({
    where: { id: "default" },
    select: {
      registrationPolicyTitle: true,
      registrationPolicyContent: true,
      registrationPolicyAgreementLabel: true,
      registrationPolicyVersion: true,
    },
  });
  return settings ?? {
    registrationPolicyTitle: DEFAULT_REGISTRATION_POLICY_TITLE,
    registrationPolicyContent: DEFAULT_REGISTRATION_POLICY_CONTENT,
    registrationPolicyAgreementLabel: DEFAULT_REGISTRATION_AGREEMENT_LABEL,
    registrationPolicyVersion: 1,
  };
}

// ---------- Mutations ----------

export async function updateStudioSettings(
  input: StudioSettingsUpdateInput,
): Promise<StudioSettingsData> {
  await requireOwner();
  const data = prepareSecretsForStorage(studioSettingsUpdateSchema.parse(input));

  const settings = await db.studioSettings.upsert({
    where: { id: "default" },
    create: { ...DEFAULT_SETTINGS, ...data },
    update: data,
  });

  return toClientSettings(settings);
}

export async function updateRegistrationPolicy(
  input: RegistrationPolicySettingsInput,
): Promise<StudioSettingsData> {
  await requireOwner();
  const data = registrationPolicySettingsSchema.parse(input);
  const settings = await db.studioSettings.upsert({
    where: { id: "default" },
    create: { ...DEFAULT_SETTINGS, ...data },
    update: { ...data, registrationPolicyVersion: { increment: 1 } },
  });
  return toClientSettings(settings);
}

export async function uploadLogo(formData: FormData): Promise<StudioSettingsData> {
  await requireOwner();

  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) {
    throw new Error("No file provided.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Logo must be under 5 MB.");
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Logo must be PNG, JPEG, WebP, or SVG.");
  }

  const ext = file.name.split(".").pop() ?? "png";
  const blob = await put(`studio-logo.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const settings = await db.studioSettings.upsert({
    where: { id: "default" },
    create: { ...DEFAULT_SETTINGS, logoUrl: blob.url },
    update: { logoUrl: blob.url },
  });

  return toClientSettings(settings);
}
