import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { CLOUDINARY_ADMIN_FOLDER, CLOUDINARY_FOLDER, uploadToCloudinary, type CloudinaryUploadKind } from "../src/lib/cloudinary";

// One-time move of every file still held in the Vercel Blob store to Cloudinary: the Media
// Library's images, videos and PDFs, expense receipts, and the studio logo. Each file is copied
// to Cloudinary and its record is pointed at the new address. Nothing is deleted: the Blob copies
// stay where they are (remove the Blob store from the Vercel dashboard once you are happy), and a
// record already in Cloudinary is skipped — so it is safe to run again.
//
//   npm run content:move-media -- --confirm-host=<database host> [--dry-run]
//
// --dry-run lists what would move without uploading or changing anything. It updates
// DATABASE_URL and uploads to the Cloudinary account named by CLOUDINARY_CLOUD_NAME,
// CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) fail("DATABASE_URL is not set.");

const host = new URL(connectionString).host;
const confirmedHost = process.argv.find((argument) => argument.startsWith("--confirm-host="))?.split("=")[1];
if (confirmedHost !== host) {
  fail(`This would update the database at "${host}". Re-run with --confirm-host=${host} if that is the intended database.`);
}
const dryRun = process.argv.includes("--dry-run");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const BLOB_HOST = ".blob.vercel-storage.com/";
const isBlobUrl = (url: string | null): url is string => Boolean(url?.includes(BLOB_HOST));

/** The Blob file's path without its extension: "/website/document/flyer-AbC123.pdf" -> "website/document/flyer-AbC123". */
const blobPath = (blobUrl: string) => decodeURIComponent(new URL(blobUrl).pathname).replace(/^\//, "").replace(/\.[a-z0-9]+$/i, "");

/** "…/website/site/images/client/founders-AbC123.jpg" -> "malhaar/website/site/images/client/founders-AbC123". */
const libraryPublicId = (blobUrl: string) => `${CLOUDINARY_FOLDER}/${blobPath(blobUrl).replace(/^website\//, "")}`;

/** "…/expense-receipt-AbC123.pdf" -> "malhaar/admin/receipts/expense-receipt-AbC123". */
const adminPublicId = (blobUrl: string, folder: string) => `${CLOUDINARY_ADMIN_FOLDER}/${folder}/${blobPath(blobUrl).split("/").pop()}`;

const kindFromExtension = (url: string): CloudinaryUploadKind => (/\.pdf$/i.test(new URL(url).pathname) ? "DOCUMENT" : "IMAGE");

type Move = { label: string; blobUrl: string; kind: CloudinaryUploadKind; publicId: string; save: (url: string, bytes: number) => Promise<unknown> };

async function collectMoves(): Promise<Move[]> {
  const [assets, expenses, settings] = await Promise.all([
    db.mediaAsset.findMany({
      where: { url: { contains: BLOB_HOST } },
      select: { id: true, kind: true, url: true, title: true },
      orderBy: { createdAt: "asc" },
    }),
    db.expense.findMany({
      where: { receiptUrl: { contains: BLOB_HOST } },
      select: { id: true, receiptUrl: true, description: true, date: true },
      orderBy: { date: "asc" },
    }),
    db.studioSettings.findUnique({ where: { id: "default" }, select: { logoUrl: true } }),
  ]);

  const moves: Move[] = assets.map((asset) => ({
    label: `Media Library: "${asset.title}"`,
    blobUrl: asset.url,
    kind: asset.kind,
    publicId: libraryPublicId(asset.url),
    save: (url, bytes) => db.mediaAsset.update({ where: { id: asset.id }, data: { url, sizeBytes: bytes } }),
  }));
  for (const expense of expenses) {
    if (!isBlobUrl(expense.receiptUrl)) continue;
    moves.push({
      label: `Expense receipt: "${expense.description}" (${expense.date.toISOString().slice(0, 10)})`,
      blobUrl: expense.receiptUrl,
      kind: kindFromExtension(expense.receiptUrl),
      publicId: adminPublicId(expense.receiptUrl, "receipts"),
      save: (url) => db.expense.update({ where: { id: expense.id }, data: { receiptUrl: url } }),
    });
  }
  const logoUrl = settings?.logoUrl ?? null;
  if (isBlobUrl(logoUrl)) {
    moves.push({
      label: "Studio logo",
      blobUrl: logoUrl,
      kind: "IMAGE",
      publicId: adminPublicId(logoUrl, "logo"),
      save: (url) => db.studioSettings.update({ where: { id: "default" }, data: { logoUrl: url } }),
    });
  }
  return moves;
}

/** Links typed in by hand are not moved, but any that still point at Blob are listed so they can be fixed. */
async function reportTypedLinks() {
  const contains = { contains: BLOB_HOST };
  const [performances, festivals, festivalMedia, press, jobs] = await Promise.all([
    db.performance.findMany({ where: { OR: [{ videoUrl: contains }, { externalUrl: contains }] }, select: { title: true } }),
    db.festival.findMany({ where: { ticketUrl: contains }, select: { label: true } }),
    db.festivalMedia.findMany({ where: { linkUrl: contains }, select: { id: true } }),
    db.pressItem.findMany({ where: { externalUrl: contains }, select: { title: true } }),
    db.jobOpening.findMany({ where: { applyUrl: contains }, select: { title: true } }),
  ]);
  const found = [
    ...performances.map((item) => `performance "${item.title}"`),
    ...festivals.map((item) => `festival "${item.label}" (ticket link)`),
    ...festivalMedia.map((item) => `festival media ${item.id} (link)`),
    ...press.map((item) => `press item "${item.title}"`),
    ...jobs.map((item) => `job opening "${item.title}"`),
  ];
  if (found.length > 0) console.warn(`Typed-in links still pointing at Blob (update these by hand):\n  ${found.join("\n  ")}`);
}

async function main() {
  const moves = await collectMoves();
  console.warn(`${dryRun ? "Would move" : "Moving"} ${moves.length} file(s) to Cloudinary (database: ${host})...`);

  let moved = 0;
  for (const move of moves) {
    if (dryRun) {
      console.warn(`  ${move.label}\n    ${move.blobUrl}\n    -> ${move.publicId}`);
      continue;
    }
    try {
      const response = await fetch(move.blobUrl);
      if (!response.ok) throw new Error(`could not read the stored file (${response.status})`);
      const stored = await uploadToCloudinary({ kind: move.kind, file: await response.blob(), publicId: move.publicId });
      // Only switch the record over once the new address really opens (a PDF is refused with
      // 401 while the account's "Allow delivery of PDF and ZIP files" setting is off).
      const check = await fetch(stored.url, { method: "HEAD" });
      if (!check.ok) throw new Error(`the Cloudinary copy does not open (${check.status}); the record was left on Blob`);
      await move.save(stored.url, stored.bytes);
      moved += 1;
      console.warn(`  moved ${move.label}`);
    } catch (error) {
      // One failed file must not stop the rest; its record keeps pointing at Blob and still works.
      console.error(`  FAILED ${move.label}: ${error instanceof Error ? error.message : error}`);
    }
  }
  if (!dryRun) console.warn(`Moved ${moved} of ${moves.length}. Records that failed still use their Blob file; run again to retry.`);
  await reportTypedLinks();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
