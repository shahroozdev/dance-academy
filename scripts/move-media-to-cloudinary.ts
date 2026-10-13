import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { CLOUDINARY_FOLDER, uploadToCloudinary } from "../src/lib/cloudinary";

// One-time move of the Media Library's images and videos from the Vercel Blob store to
// Cloudinary. For each image or video still held in Blob it copies the file to Cloudinary and
// points the library entry at the new address. Nothing is deleted: the Blob copies stay where
// they are (remove them from the Vercel dashboard once you are happy), PDFs are left in Blob on
// purpose, and an entry already in Cloudinary is skipped — so it is safe to run again.
//
//   npm run content:move-media -- --confirm-host=<database host>
//
// It updates DATABASE_URL and uploads to the Cloudinary account named by CLOUDINARY_CLOUD_NAME,
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

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** "…/website/site/images/client/founders-AbC123.jpg" -> "malhaar/website/site/images/client/founders-AbC123". */
function publicIdFor(blobUrl: string) {
  const pathname = decodeURIComponent(new URL(blobUrl).pathname).replace(/^\/(website\/)?/, "");
  return `${CLOUDINARY_FOLDER}/${pathname.replace(/\.[a-z0-9]+$/i, "")}`;
}

async function main() {
  const assets = await db.mediaAsset.findMany({
    where: { kind: { in: ["IMAGE", "VIDEO"] }, url: { contains: ".blob.vercel-storage.com/" } },
    select: { id: true, kind: true, url: true, title: true },
    orderBy: { createdAt: "asc" },
  });
  console.warn(`Moving ${assets.length} file(s) to Cloudinary (database: ${host})...`);

  let moved = 0;
  for (const asset of assets) {
    if (asset.kind === "DOCUMENT") continue;
    try {
      const response = await fetch(asset.url);
      if (!response.ok) throw new Error(`could not read the stored file (${response.status})`);
      const stored = await uploadToCloudinary({ kind: asset.kind, file: await response.blob(), publicId: publicIdFor(asset.url) });
      await db.mediaAsset.update({ where: { id: asset.id }, data: { url: stored.url, sizeBytes: stored.bytes } });
      moved += 1;
      console.warn(`  moved "${asset.title}"`);
    } catch (error) {
      // One failed file must not stop the rest; its entry keeps pointing at Blob and still works.
      console.error(`  FAILED "${asset.title}": ${error instanceof Error ? error.message : error}`);
    }
  }
  console.warn(`Moved ${moved} of ${assets.length}. Entries that failed still use their Blob file; run again to retry.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
