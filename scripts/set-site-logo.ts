import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { put } from "@vercel/blob";

import { PrismaClient } from "../src/generated/prisma/client";

// Sets the studio logo (the one managed in Studio Admin > Settings > Appearance) from a file on
// this computer — the same thing the upload button there does: the file goes to the Blob store
// and the settings record points at it. By default it uploads the logo that ships with the site.
//
//   npm run admin:set-logo -- --confirm-host=<database host> [--file=<path from the project folder>]
//
// It prints the address of the logo it replaces, so the change can be undone.

const DEFAULT_LOGO = "public/images/client/logo-no-bg.png";
const CONTENT_TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const argument = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) fail("DATABASE_URL is not set.");
if (!process.env.BLOB_READ_WRITE_TOKEN) fail("BLOB_READ_WRITE_TOKEN is not set.");
const host = new URL(connectionString).host;
if (argument("confirm-host") !== host) {
  fail(`This would update the database at "${host}". Re-run with --confirm-host=${host} if that is the intended database.`);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const file = argument("file") ?? DEFAULT_LOGO;
  const extension = path.extname(file).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) fail("The logo must be a PNG, JPEG, or WebP file.");

  const settings = await db.studioSettings.findUnique({ where: { id: "default" }, select: { logoUrl: true } });
  if (!settings) fail("The studio settings have not been created yet. Open Studio Admin > Settings once, then run this again.");

  const blob = await put(`studio-logo${extension}`, await readFile(path.join(process.cwd(), file)), {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });
  await db.studioSettings.update({ where: { id: "default" }, data: { logoUrl: blob.url } });

  console.warn(`Previous logo: ${settings.logoUrl ?? "(none — the site's built-in logo was in use)"}`);
  console.warn(`The studio logo is now ${file}, stored at ${blob.url}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
