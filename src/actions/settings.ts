"use server";

import { put } from "@vercel/blob";

import type { StudioSettingsInput } from "@/actions/settings.schema";
import { studioSettingsSchema } from "@/actions/settings.schema";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// ---------- Types ----------

export type StudioSettingsData = {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontSize: "SMALL" | "MEDIUM" | "LARGE";
  logoUrl: string | null;
  studioName: string | null;
};

// ---------- Helpers ----------

async function requireOwner() {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    throw new Error("Only the studio owner can manage settings.");
  }
  return session;
}

const DEFAULT_SETTINGS = {
  id: "default",
  primaryColor: "#9B1B5E",
  secondaryColor: "#F5D0E0",
  accentColor: "#E8A0D0",
  fontSize: "MEDIUM" as const,
  logoUrl: null,
  studioName: "Malhaar Dance Company",
};

// ---------- Queries ----------

export async function getStudioSettings(): Promise<StudioSettingsData> {
  const existing = await db.studioSettings.findUnique({ where: { id: "default" } });
  if (existing) return existing;

  const created = await db.studioSettings.create({ data: DEFAULT_SETTINGS });
  return created;
}

// ---------- Mutations ----------

export async function updateStudioSettings(
  input: StudioSettingsInput,
): Promise<StudioSettingsData> {
  await requireOwner();
  const data = studioSettingsSchema.parse(input);

  const settings = await db.studioSettings.upsert({
    where: { id: "default" },
    create: { ...DEFAULT_SETTINGS, ...data },
    update: data,
  });

  return settings;
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

  return settings;
}
