// Standalone fixture CLI, run via `tsx` (not imported into the Playwright-loaded spec file
// directly) — Prisma 7's generated client uses `import.meta`, which Playwright Test's own
// TypeScript transform can't load (this project's package.json isn't `"type": "module"`), the
// same way `prisma/seed.ts` is already run via `tsx` rather than required directly. Everything
// the acceptance-flow spec needs from the app's real UI (family id, enrollment state, etc.) is
// read off the screen instead; this CLI only handles the two things with no UI equivalent:
// one-time fixture setup and final teardown.
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

type SetupPayload = {
  ownerEmail: string;
  ownerPassword: string;
  classAName: string;
  classADanceStyle: string;
  classARate: number;
  classBName: string;
  classBDanceStyle: string;
  classBRate: number;
};

async function setup(payload: SetupPayload) {
  // Idempotent, mirrors prisma/seed.ts — makes this suite self-sufficient on a freshly migrated
  // database too, not just this already-seeded dev one.
  await db.adminUser.upsert({
    where: { email: payload.ownerEmail },
    update: {},
    create: {
      name: "Studio Owner",
      email: payload.ownerEmail,
      passwordHash: await bcrypt.hash(payload.ownerPassword, 10),
      role: "OWNER",
    },
  });

  const [classA, classB] = await Promise.all([
    db.class.create({
      data: {
        name: payload.classAName,
        danceStyle: payload.classADanceStyle,
        standardRate: payload.classARate,
        isActive: true,
      },
    }),
    db.class.create({
      data: {
        name: payload.classBName,
        danceStyle: payload.classBDanceStyle,
        standardRate: payload.classBRate,
        isActive: true,
      },
    }),
  ]);

  return { classAId: classA.id, classBId: classB.id };
}

type CleanupPayload = { phone: string; expenseDescription: string; classIds: string[] };

async function cleanup(payload: CleanupPayload) {
  // Looked up fresh by the unique phone/description this run used, rather than requiring every
  // id created along the way — self-heals even if an earlier step failed partway through, and
  // keeps this shared dev database clean since the app itself has no delete UI for most of these.
  const family = await db.family.findFirst({ where: { phone: payload.phone } });
  if (family) {
    const students = await db.student.findMany({ where: { familyId: family.id } });
    const studentIds = students.map((s) => s.id);

    const billings = await db.monthlyStudentBilling.findMany({ where: { studentId: { in: studentIds } } });
    const billingIds = billings.map((b) => b.id);

    await db.payment.deleteMany({ where: { billingId: { in: billingIds } } });
    // MonthlyBillingLineItem cascades with its parent MonthlyStudentBilling.
    await db.monthlyStudentBilling.deleteMany({ where: { id: { in: billingIds } } });
    await db.notificationLog.deleteMany({ where: { familyId: family.id } });
    await db.registrationRequest.deleteMany({ where: { matchedFamilyId: family.id } });
    await db.enrollment.deleteMany({ where: { studentId: { in: studentIds } } });
    await db.student.deleteMany({ where: { id: { in: studentIds } } });
    await db.family.delete({ where: { id: family.id } });
  }
  await db.registrationRequest.deleteMany({ where: { parentPhone: payload.phone } });

  await db.expense.deleteMany({ where: { description: payload.expenseDescription } });

  if (payload.classIds.length > 0) {
    await db.classMonthlyFee.deleteMany({ where: { classId: { in: payload.classIds } } });
    await db.class.deleteMany({ where: { id: { in: payload.classIds } } });
  }

  return { ok: true };
}

async function main() {
  const [, , command, payloadB64] = process.argv;
  const payload: unknown = payloadB64 ? JSON.parse(Buffer.from(payloadB64, "base64").toString("utf8")) : {};

  let result: unknown;
  if (command === "setup") result = await setup(payload as SetupPayload);
  else if (command === "cleanup") result = await cleanup(payload as CleanupPayload);
  else throw new Error(`Unknown db-cli command: ${command}`);

  // The wrapper in e2e/helpers.ts parses only the last stdout line as JSON, so any Prisma/tsx
  // noise on stdout ahead of this can't break it.
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
