// Fixture CLI for the Content Portal suite, run via `tsx` for the same reason as db-cli.ts
// (Prisma's generated client cannot be loaded by Playwright's own TypeScript transform).
//
// It does only what the browser cannot: put one inquiry in the list without sending the staff
// email alert that the real contact form sends, and remove the records one test run created.
// Cleanup is deliberately narrow — every row it deletes carries that run's unique tag, which
// nothing but the test run writes — so it can never touch real content.
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

type RunPayload = { tag: string };

const assertTag = (tag: string) => {
  if (!/^E2E-[a-z0-9]{6,}$/.test(tag)) throw new Error(`Refusing to run with an unexpected tag: ${tag}`);
};

async function seedInquiry({ tag }: RunPayload) {
  assertTag(tag);
  const inquiry = await db.inquiry.create({
    data: {
      name: `${tag} Visitor`,
      email: `${tag.toLowerCase()}@e2e.example.test`,
      phone: "+12245550100",
      studentName: "Test Student",
      studentAge: "9",
      interestedIn: "Bharatanatyam",
      preferredLocation: "Elgin",
      message: `Automated test inquiry ${tag}. Is there a beginner class?`,
    },
    select: { id: true },
  });
  return { id: inquiry.id };
}

async function cleanup({ tag }: RunPayload) {
  assertTag(tag);
  const tagged = { contains: tag };
  // Children of a festival or performance go with it (cascade); library files are removed last
  // because content rows may still point at them.
  const deleted = {
    inquiries: (await db.inquiry.deleteMany({ where: { name: tagged } })).count,
    festivals: (await db.festival.deleteMany({ where: { label: tagged } })).count,
    performances: (await db.performance.deleteMany({ where: { title: tagged } })).count,
    pressItems: (await db.pressItem.deleteMany({ where: { title: tagged } })).count,
    profiles: (await db.publicProfile.deleteMany({ where: { name: tagged } })).count,
    mediaAssets: (await db.mediaAsset.deleteMany({ where: { title: tagged } })).count,
    users: (await db.contentUser.deleteMany({ where: { name: tagged } })).count,
    history: (await db.contentAuditLog.deleteMany({ where: { OR: [{ summary: tagged }, { userName: tagged }] } })).count,
  };
  return deleted;
}

async function main() {
  const [, , command, payloadB64] = process.argv;
  const payload = JSON.parse(Buffer.from(payloadB64 ?? "", "base64").toString("utf8")) as RunPayload;

  let result: unknown;
  if (command === "seed-inquiry") result = await seedInquiry(payload);
  else if (command === "cleanup") result = await cleanup(payload);
  else throw new Error(`Unknown content-db-cli command: ${command}`);

  // Only the last stdout line is parsed by the caller, so any earlier noise cannot break it.
  process.stdout.write(`\n${JSON.stringify(result)}\n`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
