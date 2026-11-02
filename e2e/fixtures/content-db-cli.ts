// Fixture CLI for the Content Portal suite, run via `tsx` for the same reason as db-cli.ts
// (Prisma's generated client cannot be loaded by Playwright's own TypeScript transform).
//
// It does only what the browser cannot: put one inquiry or job application in the list without
// sending the staff email alert that the real forms send, check whether a private resume file still
// exists, and remove the records one test run created.
// Cleanup is deliberately narrow — every row it deletes carries that run's unique tag, which
// nothing but the test run writes — so it can never touch real content.
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";
import { deletePrivateDocument, privateDocumentUrl, uploadPrivateDocument } from "../../src/lib/cloudinary";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

type RunPayload = { tag: string; jobId?: string; publicId?: string };

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

/** A job application for the run's opening, with a tiny resume stored privately like a real one. */
async function seedApplication({ tag, jobId }: RunPayload) {
  assertTag(tag);
  const job = await db.jobOpening.findFirstOrThrow({ where: { id: jobId, title: { contains: tag } }, select: { id: true, title: true } });
  const pdf = new Blob([`%PDF-1.4\n% Automated test resume ${tag}\n%%EOF\n`], { type: "application/pdf" });
  const resumePublicId = await uploadPrivateDocument(pdf, "resume.pdf");
  const application = await db.inquiry.create({
    data: {
      name: `${tag} Applicant`,
      email: `${tag.toLowerCase()}-applicant@e2e.example.test`,
      phone: "+12245550101",
      interestedIn: "Job Application",
      jobOpeningId: job.id,
      jobTitle: job.title,
      experience: `Automated test application ${tag}. Eight years of Bharatanatyam.`,
      availability: "Weekday evenings",
      message: "",
      resumePublicId,
      resumeName: "test-resume.pdf",
    },
    select: { id: true },
  });
  return { id: application.id, resumePublicId };
}

/** Whether a private resume can still be fetched (it should not, once its application is deleted). */
async function resumeExists({ tag, publicId }: RunPayload) {
  assertTag(tag);
  if (!publicId?.startsWith("malhaar/applications/")) throw new Error("Refusing to check an unexpected file.");
  const response = await fetch(privateDocumentUrl(publicId));
  return { exists: response.ok, status: response.status };
}

async function cleanup({ tag }: RunPayload) {
  assertTag(tag);
  const tagged = { contains: tag };
  // Private resumes are files outside the database, so they are removed before their rows.
  const resumes = await db.inquiry.findMany({ where: { name: tagged, resumePublicId: { not: null } }, select: { resumePublicId: true } });
  for (const { resumePublicId } of resumes) await deletePrivateDocument(resumePublicId!).catch(() => {});
  // Children of a festival or performance go with it (cascade); library files are removed last
  // because content rows may still point at them.
  const deleted = {
    resumes: resumes.length,
    inquiries: (await db.inquiry.deleteMany({ where: { name: tagged } })).count,
    jobOpenings: (await db.jobOpening.deleteMany({ where: { title: tagged } })).count,
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
  else if (command === "seed-application") result = await seedApplication(payload);
  else if (command === "resume-exists") result = await resumeExists(payload);
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
