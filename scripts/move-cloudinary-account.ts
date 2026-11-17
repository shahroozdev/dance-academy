import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { getCloudinaryConfig, signCloudinaryParams } from "../src/lib/cloudinary";

// Moves the studio's files from one Cloudinary account to another (our development account to
// the client's own). Every file under "malhaar/" is copied with the same name, type and privacy,
// so its address only changes in the account name; then every stored link in the database is
// switched to the new account. Only "malhaar/" is touched: the old account may hold other
// projects' files. The old copies are left alone unless --delete-source is given, which removes
// "malhaar/" from the OLD account once every file is confirmed present in the new one.
//
//   SOURCE_CLOUDINARY_CLOUD_NAME / SOURCE_CLOUDINARY_API_KEY / SOURCE_CLOUDINARY_API_SECRET = old account
//   CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET                      = new account
//
//   npm run content:move-account -- --confirm-host=<database host> [--dry-run] [--delete-source]
//
// Safe to run again: files already in the new account are skipped, and links already pointing
// at the new account are left as they are.

const PREFIX = "malhaar/";
const RESOURCE_TYPES = ["image", "video", "raw"] as const;
const DELIVERY_TYPES = ["upload", "authenticated"] as const;
const PARALLEL_UPLOADS = 4;

// Every column that can hold a link to a stored file (content otherwise refers to files by id).
const LINK_COLUMNS = [
  ["MediaAsset", "url"],
  ["Expense", "receiptUrl"],
  ["StudioSettings", "logoUrl"],
  ["Performance", "videoUrl"],
  ["Performance", "externalUrl"],
  ["Festival", "ticketUrl"],
  ["FestivalMedia", "linkUrl"],
  ["PressItem", "externalUrl"],
  ["JobOpening", "applyUrl"],
] as const;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

type Account = { cloudName: string; apiKey: string; apiSecret: string };
type Resource = { public_id: string; resource_type: string; type: string; format?: string; bytes: number; secure_url: string };

const source: Account = {
  cloudName: process.env.SOURCE_CLOUDINARY_CLOUD_NAME ?? "",
  apiKey: process.env.SOURCE_CLOUDINARY_API_KEY ?? "",
  apiSecret: process.env.SOURCE_CLOUDINARY_API_SECRET ?? "",
};
if (!source.cloudName || !source.apiKey || !source.apiSecret) fail("Set SOURCE_CLOUDINARY_CLOUD_NAME, _API_KEY and _API_SECRET (the old account).");
const target: Account = getCloudinaryConfig();
if (source.cloudName === target.cloudName) fail("The old and new Cloudinary accounts are the same.");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) fail("DATABASE_URL is not set.");
const host = new URL(connectionString).host;
if (process.argv.find((value) => value.startsWith("--confirm-host="))?.split("=")[1] !== host) {
  fail(`This would update the database at "${host}". Re-run with --confirm-host=${host} if that is the intended database.`);
}
const dryRun = process.argv.includes("--dry-run");
const deleteSource = process.argv.includes("--delete-source");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const adminAuth = ({ apiKey, apiSecret }: Account) => `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
const keyOf = (resource: Pick<Resource, "resource_type" | "type" | "public_id">) =>
  `${resource.resource_type}/${resource.type}/${resource.public_id}`;

async function listFiles(account: Account) {
  const files: Resource[] = [];
  for (const resourceType of RESOURCE_TYPES) {
    for (const type of DELIVERY_TYPES) {
      let cursor = "";
      do {
        const query = new URLSearchParams({ prefix: PREFIX, max_results: "500", ...(cursor && { next_cursor: cursor }) });
        const response = await fetch(`https://api.cloudinary.com/v1_1/${account.cloudName}/resources/${resourceType}/${type}?${query}`, {
          headers: { authorization: adminAuth(account) },
        });
        const page = (await response.json()) as { resources?: Resource[]; next_cursor?: string; error?: { message: string } };
        if (!response.ok) throw new Error(`Listing ${account.cloudName} failed: ${page.error?.message ?? response.status}`);
        files.push(...(page.resources ?? []));
        cursor = page.next_cursor ?? "";
      } while (cursor);
    }
  }
  return files;
}

/** Where the new account can fetch the file from: its public address, or a short-lived signed download for a private one. */
function sourceAddress(file: Resource) {
  if (file.type === "upload") return file.secure_url;
  const timestamp = Math.floor(Date.now() / 1000);
  const fields = {
    expires_at: timestamp + 3600,
    public_id: file.public_id,
    timestamp,
    type: file.type,
    ...(file.format && { format: file.format }),
  };
  const query = new URLSearchParams({
    ...Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, String(value)])),
    api_key: source.apiKey,
    signature: signCloudinaryParams(fields, source.apiSecret),
  });
  return `https://api.cloudinary.com/v1_1/${source.cloudName}/${file.resource_type}/download?${query}`;
}

async function copyFile(file: Resource) {
  const fields: Record<string, string | number> = {
    // Videos get the same compressed copy prepared at upload time as a normal upload (see cloudinary.ts).
    ...(file.resource_type === "video" && { eager: "q_auto", eager_async: "true" }),
    overwrite: "false",
    public_id: file.public_id,
    timestamp: Math.floor(Date.now() / 1000),
    type: file.type,
  };
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.set(name, String(value));
  body.set("api_key", target.apiKey);
  body.set("signature", signCloudinaryParams(fields, target.apiSecret));
  body.set("file", sourceAddress(file));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${target.cloudName}/${file.resource_type}/upload`, { method: "POST", body });
  const result = (await response.json()) as { public_id?: string; error?: { message: string } };
  if (!response.ok || result.public_id !== file.public_id) throw new Error(result.error?.message ?? `upload failed (${response.status})`);
}

async function copyMissing(sourceFiles: Resource[]) {
  const present = new Set((await listFiles(target)).map(keyOf));
  const missing = sourceFiles.filter((file) => !present.has(keyOf(file)));
  const megabytes = (missing.reduce((total, file) => total + file.bytes, 0) / 1e6).toFixed(1);
  console.warn(`${missing.length} of ${sourceFiles.length} file(s) still to copy (${megabytes} MB).`);
  if (dryRun) return;

  let done = 0;
  let failed = 0;
  const queue = [...missing];
  await Promise.all(
    Array.from({ length: PARALLEL_UPLOADS }, async () => {
      for (let file = queue.shift(); file; file = queue.shift()) {
        try {
          await copyFile(file);
          done += 1;
          if (done % 25 === 0) console.warn(`  copied ${done}/${missing.length}`);
        } catch (error) {
          failed += 1;
          console.error(`  FAILED ${keyOf(file)}: ${error instanceof Error ? error.message : error}`);
        }
      }
    }),
  );
  console.warn(`Copied ${done}, failed ${failed}.`);
}

async function switchLinks() {
  const from = `https://res.cloudinary.com/${source.cloudName}/`;
  const to = `https://res.cloudinary.com/${target.cloudName}/`;
  // A link to a file outside "malhaar/" would not have been copied, so switching it would break it.
  for (const [table, column] of LINK_COLUMNS) {
    const rows = (await db.$queryRawUnsafe(
      `SELECT "${column}" AS link FROM "${table}" WHERE "${column}" LIKE $1 AND "${column}" NOT LIKE $2`,
      `${from}%`,
      `%/${PREFIX}%`,
    )) as { link: string }[];
    if (rows.length > 0) fail(`${table}.${column} links to files outside "${PREFIX}", which are not copied:\n  ${rows.map((row) => row.link).join("\n  ")}`);
  }
  for (const [table, column] of LINK_COLUMNS) {
    const sql = dryRun
      ? `SELECT count(*)::int AS n FROM "${table}" WHERE "${column}" LIKE $1`
      : `UPDATE "${table}" SET "${column}" = replace("${column}", $2, $3) WHERE "${column}" LIKE $1`;
    const pattern = `${from}%`;
    const changed = dryRun
      ? ((await db.$queryRawUnsafe(sql, pattern)) as { n: number }[])[0].n
      : await db.$executeRawUnsafe(sql, pattern, from, to);
    if (changed > 0) console.warn(`  ${table}.${column}: ${changed} link(s) ${dryRun ? "to switch" : "switched"}`);
  }
}

async function deleteSourceFiles() {
  for (const resourceType of RESOURCE_TYPES) {
    for (const type of DELIVERY_TYPES) {
      // Deletes at most 1000 per call, so repeat until nothing under the prefix is left.
      for (;;) {
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${source.cloudName}/resources/${resourceType}/${type}?prefix=${encodeURIComponent(PREFIX)}`,
          { method: "DELETE", headers: { authorization: adminAuth(source) } },
        );
        const result = (await response.json()) as { deleted?: Record<string, string>; partial?: boolean; error?: { message: string } };
        if (!response.ok) throw new Error(`Deleting from ${source.cloudName} failed: ${result.error?.message ?? response.status}`);
        const count = Object.keys(result.deleted ?? {}).length;
        if (count > 0) console.warn(`  removed ${count} ${resourceType}/${type} file(s) from ${source.cloudName}`);
        if (!result.partial) break;
      }
    }
  }
}

async function main() {
  console.warn(`${dryRun ? "[dry run] " : ""}Moving "${PREFIX}" from ${source.cloudName} to ${target.cloudName} (database: ${host})`);
  const sourceFiles = await listFiles(source);
  await copyMissing(sourceFiles);

  const present = new Set((await listFiles(target)).map(keyOf));
  const stillMissing = sourceFiles.filter((file) => !present.has(keyOf(file)));
  if (stillMissing.length > 0 && !dryRun) {
    fail(`${stillMissing.length} file(s) are not in ${target.cloudName} yet, so the database was not changed. Run again to retry.`);
  }

  console.warn("Database links:");
  await switchLinks();

  if (deleteSource && !dryRun) {
    console.warn(`Removing "${PREFIX}" from ${source.cloudName} (every file is confirmed in ${target.cloudName})...`);
    await deleteSourceFiles();
  }
  console.warn("Done.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
