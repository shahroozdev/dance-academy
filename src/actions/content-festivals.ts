"use server";

import { requireContentUser } from "@/actions/content-access";
import { assertAssetKinds, recordContentAudit, revalidatePublicSite } from "@/actions/content-service";
import { festivalSchema, type FestivalInput } from "@/actions/content.schema";
import { idSchema } from "@/actions/validation.schema";
import { parseDateInput } from "@/lib/content-format";
import { festivalInclude } from "@/lib/content-mappers";
import { assertCanRevise, statusAfterRevision } from "@/lib/content-publishing";
import { db } from "@/lib/db";

const festivalPaths = (year: string) => ["/ananta", `/ananta/${year}`];

export async function getContentFestivals() {
  await requireContentUser();
  return db.festival.findMany({
    orderBy: { year: "desc" },
    select: {
      id: true,
      year: true,
      label: true,
      eventDate: true,
      venueName: true,
      status: true,
      publishedAt: true,
      publishedByName: true,
      updatedAt: true,
      _count: { select: { artists: true, media: true } },
    },
  });
}

export async function getContentFestivalById(id: string) {
  await requireContentUser();
  return db.festival.findUniqueOrThrow({ where: { id: idSchema.parse(id) }, include: festivalInclude });
}

const festivalColumns = (data: FestivalInput) => ({
  year: data.year,
  label: data.label,
  eventDate: parseDateInput(data.eventDate),
  startTime: data.startTime,
  venueName: data.venueName,
  venueTown: data.venueTown,
  venueRegion: data.venueRegion,
  venueStreet: data.venueStreet || null,
  venuePostalCode: data.venuePostalCode || null,
  summary: data.summary,
  ticketUrl: data.ticketUrl || null,
});

const artistRows = (data: FestivalInput) =>
  data.artists.map((artist, sortOrder) => ({
    name: artist.name,
    artForm: artist.artForm,
    biography: artist.biography || null,
    photoId: artist.photoId || null,
    sortOrder,
  }));

const mediaRows = (data: FestivalInput) =>
  data.media.map((item, sortOrder) => ({
    assetId: item.assetId,
    role: item.role,
    caption: item.caption || null,
    linkUrl: item.linkUrl || null,
    sortOrder,
  }));

async function validateFestival(data: FestivalInput, currentId?: string) {
  const sameYear = await db.festival.findUnique({ where: { year: data.year }, select: { id: true } });
  if (sameYear && sameYear.id !== currentId) throw new Error(`A festival for ${data.year} already exists.`);

  await assertAssetKinds([
    ...data.artists
      .filter((artist) => artist.photoId)
      .map((artist) => ({ assetId: artist.photoId, kind: "IMAGE" as const, label: `The photo for ${artist.name}` })),
    ...data.media.map((item) => ({
      assetId: item.assetId,
      kind: item.role === "VIDEO" ? ("VIDEO" as const) : ("IMAGE" as const),
      label: `A festival ${item.role.toLowerCase()} item`,
    })),
  ]);
}

export async function createFestival(data: FestivalInput) {
  const user = await requireContentUser();
  data = festivalSchema.parse(data);
  await validateFestival(data);

  const festival = await db.festival.create({
    data: { ...festivalColumns(data), artists: { create: artistRows(data) }, media: { create: mediaRows(data) } },
    select: { id: true },
  });
  await recordContentAudit(user, {
    action: "created",
    entityType: "festival",
    entityId: festival.id,
    summary: `Created the ${data.year} festival as a draft.`,
  });
  return festival;
}

export async function updateFestival(id: string, data: FestivalInput) {
  const user = await requireContentUser();
  id = idSchema.parse(id);
  data = festivalSchema.parse(data);

  const existing = await db.festival.findUniqueOrThrow({ where: { id }, select: { status: true, year: true } });
  assertCanRevise(user.role, existing.status);
  await validateFestival(data, id);
  const status = statusAfterRevision(existing.status);

  await db.$transaction([
    db.festivalArtist.deleteMany({ where: { festivalId: id } }),
    db.festivalMedia.deleteMany({ where: { festivalId: id } }),
    db.festival.update({
      where: { id },
      data: { ...festivalColumns(data), status, artists: { create: artistRows(data) }, media: { create: mediaRows(data) } },
    }),
  ]);
  await recordContentAudit(user, {
    action: "updated",
    entityType: "festival",
    entityId: id,
    summary:
      existing.status === "PUBLISHED"
        ? `Revised the ${data.year} festival; it returned to draft until published again.`
        : `Updated the ${data.year} festival.`,
  });
  if (existing.status === "PUBLISHED") revalidatePublicSite(festivalPaths(existing.year));
  return { id, status };
}
