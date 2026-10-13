import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { CLOUDINARY_FOLDER, uploadToCloudinary } from "../src/lib/cloudinary";

// Stores a batch of photos from this computer in the Cloudinary bucket, under an "archive"
// folder that mirrors where each file was. Photos marked "library" in the manifest are also
// added to the Media Library so they can be chosen for a page; the rest are only kept safe.
// Nothing is placed on any public page. Safe to run again: a stored file is overwritten with
// itself and an existing library entry is left alone.
//
//   npm run content:archive-photos -- --manifest=<file.json> --confirm-host=<database host>
//
// The manifest is a JSON list of { "file", "title", "alt", "library": true|false }.

const CONTENT_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const PARALLEL_UPLOADS = 4;

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

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

type ManifestEntry = { file: string; title: string; alt: string; library: boolean };

async function store(entry: ManifestEntry) {
  const extension = path.extname(entry.file).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) throw new Error("unsupported file type");

  const file = await readFile(path.join(process.cwd(), entry.file));
  const stored = await uploadToCloudinary({
    kind: "IMAGE",
    file: new Blob([new Uint8Array(file)], { type: contentType }),
    publicId: `${CLOUDINARY_FOLDER}/archive/${entry.file.replace(/\\/g, "/").replace(/\.[a-z0-9]+$/i, "")}`,
  });
  if (stored.bytes !== file.byteLength) throw new Error(`stored ${stored.bytes} bytes, expected ${file.byteLength}`);

  if (!entry.library) return "archived";
  if (await db.mediaAsset.findFirst({ where: { url: stored.url }, select: { id: true } })) return "archived";
  await db.mediaAsset.create({
    data: {
      kind: "IMAGE",
      url: stored.url,
      title: entry.title,
      altText: entry.alt,
      contentType,
      sizeBytes: stored.bytes,
      uploadedByName: "Website setup",
    },
  });
  return "library";
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as ManifestEntry[];
  const stored: string[] = [];
  const failed: string[] = [];
  let addedToLibrary = 0;

  for (let start = 0; start < manifest.length; start += PARALLEL_UPLOADS) {
    await Promise.all(
      manifest.slice(start, start + PARALLEL_UPLOADS).map(async (entry) => {
        try {
          if ((await store(entry)) === "library") addedToLibrary += 1;
          stored.push(entry.file);
        } catch (error) {
          failed.push(entry.file);
          console.error(`  FAILED ${entry.file}: ${error instanceof Error ? error.message : error}`);
        }
      }),
    );
  }

  if (addedToLibrary > 0) {
    await db.contentAuditLog.create({
      data: {
        userName: "Website setup",
        action: "uploaded",
        entityType: "media",
        summary: `Added ${addedToLibrary} photo(s) from the Facebook and Instagram pages to the Media Library.`,
      },
    });
  }
  // The files confirmed stored, one per line, for whoever cleans up the local copies.
  process.stdout.write(`${JSON.stringify({ stored, failed })}\n`);
  console.warn(`Stored ${stored.length} of ${manifest.length} (${addedToLibrary} added to the Media Library, ${failed.length} failed).`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
