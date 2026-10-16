// Fixture CLI for the Outstanding Fees browser test, run via `tsx` for the same reason as
// db-cli.ts (Prisma's generated client cannot be loaded by Playwright's own TypeScript transform).
//
// It writes exactly one thing: a temporary STAFF sign-in carrying the run's unique E2E tag, which
// `cleanup` deletes again. It never touches families, students, classes, bills or payments; the
// totals command only reads.
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

type RunPayload = { tag: string; password?: string };

const assertTag = (tag: string) => {
  if (!/^E2E-[a-z0-9]{6,}$/.test(tag)) throw new Error(`Refusing to run with an unexpected tag: ${tag}`);
};
const emailFor = (tag: string) => `${tag.toLowerCase()}@e2e.example.test`;

async function createStaff({ tag, password }: RunPayload) {
  assertTag(tag);
  if (!password) throw new Error("A password is required.");
  await db.adminUser.create({
    data: { name: `${tag} browser check`, email: emailFor(tag), passwordHash: await bcrypt.hash(password, 10), role: "STAFF" },
  });
  return { email: emailFor(tag) };
}

// What the Outstanding Fees page must show for "All classes", read straight from the bills.
async function outstandingTotals() {
  const where = { balance: { gt: 0 } };
  const [bills, students, sums, withPositiveAdjustment] = await Promise.all([
    db.monthlyStudentBilling.count({ where }),
    db.student.count({ where: { monthlyBillings: { some: where } } }),
    db.monthlyStudentBilling.aggregate({ where, _sum: { balance: true } }),
    db.monthlyStudentBilling.count({ where: { ...where, adjustment: { gt: 0 } } }),
  ]);
  return { bills, students, due: Number(sums._sum.balance ?? 0), withPositiveAdjustment };
}

async function cleanup({ tag }: RunPayload) {
  assertTag(tag);
  const users = (await db.adminUser.deleteMany({ where: { email: emailFor(tag), name: { contains: tag } } })).count;
  const remaining = await db.adminUser.count({ where: { email: { endsWith: "@e2e.example.test" } } });
  return { users, remaining };
}

async function main() {
  const [, , command, payloadB64] = process.argv;
  const payload = JSON.parse(Buffer.from(payloadB64 ?? "", "base64").toString("utf8")) as RunPayload;

  let result: unknown;
  if (command === "create-staff") result = await createStaff(payload);
  else if (command === "outstanding-totals") result = await outstandingTotals();
  else if (command === "cleanup") result = await cleanup(payload);
  else throw new Error(`Unknown admin-db-cli command: ${command}`);

  // Only the last stdout line is parsed by the caller, so any earlier noise cannot break it.
  process.stdout.write(`\n${JSON.stringify(result)}\n`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
