import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { CLOUDINARY_FOLDER, uploadToCloudinary } from "../src/lib/cloudinary";

// Adds a batch of photos from this computer to a performance's gallery: each photo is stored in
// Cloudinary, added to the Media Library with its description, and appended to the gallery.
// A photo already stored, or already in the gallery, is skipped, so it is safe to run again.
//
//   npm run content:add-gallery-photos -- --manifest=<file.json> --performance=<page address> --confirm-host=<database host>
//
// The manifest is a JSON list of { "file": "<path from the project folder>", "alt": "<what the
// photo shows>" }. It writes to DATABASE_URL and uploads to the Cloudinary account in .env.

const CONTENT_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const argument = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) fail("DATABASE_URL is not set.");
const host = new URL(connectionString).host;
if (argument("confirm-host") !== host) {
  fail(`This would write to the database at "${host}". Re-run with --confirm-host=${host} if that is the intended database.`);
}
const manifestPath = argument("manifest") ?? fail("Pass --manifest=<file.json>.");
const slug = argument("performance") ?? fail("Pass --performance=<page address>.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

type ManifestEntry = { file: string; alt: string };

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as ManifestEntry[];
  const performance = await db.performance.findUnique({
    where: { slug },
    select: { id: true, title: true, media: { select: { assetId: true, sortOrder: true } } },
  });
  if (!performance) fail(`No performance has the page address "${slug}".`);

  const inGallery = new Set(performance.media.map((item) => item.assetId));
  let nextOrder = Math.max(-1, ...performance.media.map((item) => item.sortOrder)) + 1;
  let added = 0;

  for (const entry of manifest) {
    const extension = path.extname(entry.file).toLowerCase();
    const contentType = CONTENT_TYPES[extension];
    if (!contentType || !entry.alt.trim()) fail(`"${entry.file}" needs a supported image type and a description.`);

    const file = await readFile(path.join(process.cwd(), entry.file));
    const stored = await uploadToCloudinary({
      kind: "IMAGE",
      file: new Blob([new Uint8Array(file)], { type: contentType }),
      publicId: `${CLOUDINARY_FOLDER}/gallery/${path.basename(entry.file, extension)}`,
    });

    const asset =
      (await db.mediaAsset.findFirst({ where: { url: stored.url }, select: { id: true } })) ??
      (await db.mediaAsset.create({
        data: {
          kind: "IMAGE",
          url: stored.url,
          title: entry.alt,
          altText: entry.alt,
          contentType,
          sizeBytes: stored.bytes,
          uploadedByName: "Website setup",
        },
        select: { id: true },
      }));
    if (inGallery.has(asset.id)) continue;

    await db.performanceMedia.create({ data: { performanceId: performance.id, assetId: asset.id, sortOrder: nextOrder } });
    inGallery.add(asset.id);
    nextOrder += 1;
    added += 1;
  }

  const summary = `Added ${added} photo(s) to the gallery of "${performance.title}".`;
  await db.contentAuditLog.create({
    data: { userName: "Website setup", action: "updated", entityType: "performance", entityId: performance.id, summary },
  });
  console.warn(`${summary} (${manifest.length - added} already there.)`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
