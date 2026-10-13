"use server";

import { requireContentUser } from "@/actions/content-access";
import { assertAssetKinds, recordContentAudit, revalidatePublicSite } from "@/actions/content-service";
import { profileSchema, type ProfileInput } from "@/actions/content.schema";
import { idSchema } from "@/actions/validation.schema";
import { profileInclude } from "@/lib/content-mappers";
import { db } from "@/lib/db";
import type { ContentActor } from "@/types/content";

const PROFILE_PATHS = ["/instructors"];

export async function getContentProfiles() {
  await requireContentUser();
  return db.publicProfile.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, title: true, isVisible: true, sortOrder: true, updatedAt: true },
  });
}

export async function getContentProfileById(id: string) {
  await requireContentUser();
  return db.publicProfile.findUniqueOrThrow({ where: { id: idSchema.parse(id) }, include: profileInclude });
}

const profileColumns = (data: ProfileInput) => ({
  name: data.name,
  title: data.title,
  summary: data.summary,
  biography: data.biography,
  specializations: data.specializations
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean),
  photoId: data.photoId || null,
  isVisible: data.isVisible,
});

/** Showing a profile on the website is a publishing decision, so it is the owner's alone. */
function assertVisibilityAllowed(user: ContentActor, wasVisible: boolean, willBeVisible: boolean) {
  if (user.role !== "OWNER" && (wasVisible || willBeVisible)) {
    throw new Error("Only a Content Owner can change a profile that is shown on the website.");
  }
}

const assertProfilePhoto = (data: ProfileInput) =>
  assertAssetKinds(data.photoId ? [{ assetId: data.photoId, kind: "IMAGE", label: "The profile photo" }] : []);

export async function createProfile(data: ProfileInput) {
  const user = await requireContentUser();
  data = profileSchema.parse(data);
  assertVisibilityAllowed(user, false, data.isVisible);
  await assertProfilePhoto(data);

  const last = await db.publicProfile.aggregate({ _max: { sortOrder: true } });
  const profile = await db.publicProfile.create({
    data: { ...profileColumns(data), sortOrder: (last._max.sortOrder ?? -1) + 1 },
    select: { id: true },
  });
  await recordContentAudit(user, {
    action: "created",
    entityType: "profile",
    entityId: profile.id,
    summary: `Created the profile for ${data.name}${data.isVisible ? " and showed it on the website" : ""}.`,
  });
  if (data.isVisible) revalidatePublicSite(PROFILE_PATHS);
  return profile;
}

export async function updateProfile(id: string, data: ProfileInput) {
  const user = await requireContentUser();
  id = idSchema.parse(id);
  data = profileSchema.parse(data);

  const existing = await db.publicProfile.findUniqueOrThrow({ where: { id }, select: { isVisible: true } });
  assertVisibilityAllowed(user, existing.isVisible, data.isVisible);
  await assertProfilePhoto(data);

  await db.publicProfile.update({ where: { id }, data: profileColumns(data) });
  await recordContentAudit(user, {
    action: "updated",
    entityType: "profile",
    entityId: id,
    summary: `Updated the profile for ${data.name} (${data.isVisible ? "shown on" : "hidden from"} the website).`,
  });
  if (existing.isVisible || data.isVisible) revalidatePublicSite(PROFILE_PATHS);
  return { id };
}

/** Moves a profile one place earlier or later in the order shown on the website. */
export async function moveProfile(id: string, direction: "up" | "down") {
  const user = await requireContentUser();
  if (user.role !== "OWNER") throw new Error("Only a Content Owner can reorder profiles.");
  id = idSchema.parse(id);

  const profiles = await db.publicProfile.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const from = profiles.findIndex((profile) => profile.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= profiles.length) return { id };

  [profiles[from], profiles[to]] = [profiles[to], profiles[from]];
  await db.$transaction(
    profiles.map((profile, sortOrder) => db.publicProfile.update({ where: { id: profile.id }, data: { sortOrder } })),
  );
  revalidatePublicSite(PROFILE_PATHS);
  return { id };
}
