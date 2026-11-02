"use server";

import { createHash } from "node:crypto";

import { headers } from "next/headers";

import { sendAdminOperationalAlert } from "@/actions/email";
import {
  GENERAL_APPLICATION,
  JOB_APPLICATION_TOPIC,
  MAX_RESUME_BYTES,
  jobApplicationSchema,
  websiteInquirySchema,
  type WebsiteInquiryInput,
} from "@/actions/inquiries.schema";
import type { Prisma } from "@/generated/prisma/client";
import { deletePrivateDocument, uploadPrivateDocument } from "@/lib/cloudinary";
import { db } from "@/lib/db";

const MAX_INQUIRIES_PER_HOUR = 5;
const ONE_HOUR_MS = 60 * 60 * 1000;

const TOO_MANY = "Too many messages were sent from this connection. Please try again later.";

/**
 * A one-way fingerprint of the sender's network address, so repeated messages from one visitor
 * can be counted without keeping the address. Null when the address is not known.
 */
async function getSenderKey() {
  const forwardedFor = (await headers()).get("x-forwarded-for");
  const address = forwardedFor?.split(",")[0]?.trim();
  if (!address) return null;
  return createHash("sha256").update(`${address}|${process.env.NEXTAUTH_SECRET ?? ""}`).digest("hex").slice(0, 32);
}

/** Whether this sender has already sent the most messages allowed in an hour (both forms count). */
async function isOverHourlyLimit(senderKey: string | null) {
  if (!senderKey) return false;
  try {
    const recent = await db.inquiry.count({ where: { senderKey, createdAt: { gte: new Date(Date.now() - ONE_HOUR_MS) } } });
    return recent >= MAX_INQUIRIES_PER_HOUR;
  } catch {
    // Saving will fail the same way, and is handled there.
    return false;
  }
}

type SaveResult = { outcome: "saved"; id: string } | { outcome: "unavailable" };

/** Saves the message for the Content Portal. */
async function saveInquiry(data: Omit<Prisma.InquiryUncheckedCreateInput, "senderKey">, senderKey: string | null): Promise<SaveResult> {
  try {
    const saved = await db.inquiry.create({ data: { ...data, senderKey }, select: { id: true } });
    return { outcome: "saved", id: saved.id };
  } catch (error) {
    // The email alert is then the only record, so its failure is reported to the visitor.
    console.error("[website] An inquiry could not be saved:", error instanceof Error ? error.message : error);
    return { outcome: "unavailable" };
  }
}

async function emailStaff(subject: string, lines: (string | false | null | undefined)[]) {
  try {
    const result = await sendAdminOperationalAlert({
      setting: "registrationAlertEnabled",
      subject,
      lines: lines.filter((line): line is string => typeof line === "string"),
    });
    return result.sent;
  } catch (error) {
    console.error("[website] The inquiry email alert failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

// Saving is what counts: once the message is saved the visitor is told it was sent even if the
// email fails, because nothing is lost. Only when it can be neither saved nor emailed is the
// failure reported back to the visitor.
async function finishDelivery(saved: SaveResult, emailed: boolean) {
  if (saved.outcome === "unavailable") {
    if (!emailed) throw new Error("The inquiry could not be delivered.");
    return { sent: true };
  }
  if (emailed) {
    // Best effort: the flag only tells staff whether the email alert went out.
    await db.inquiry.update({ where: { id: saved.id }, data: { emailAlertSent: true } }).catch(() => {});
  }
  return { sent: true };
}

// Public (no session): the website contact form.
export async function submitWebsiteInquiry(data: WebsiteInquiryInput) {
  const inquiry = websiteInquirySchema.parse(data);
  if (inquiry.company) return { sent: true };

  const senderKey = await getSenderKey();
  if (await isOverHourlyLimit(senderKey)) throw new Error(TOO_MANY);

  const saved = await saveInquiry(
    {
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone || null,
      studentName: inquiry.studentName || null,
      studentAge: inquiry.studentAge || null,
      interestedIn: inquiry.interestedIn,
      preferredLocation: inquiry.preferredLocation || null,
      message: inquiry.message,
    },
    senderKey,
  );
  const emailed = await emailStaff(`Website inquiry — ${inquiry.interestedIn} — ${inquiry.name}`, [
    "A new inquiry was sent from the website contact form.",
    "",
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    inquiry.phone && `Phone: ${inquiry.phone}`,
    inquiry.studentName && `Student name: ${inquiry.studentName}`,
    inquiry.studentAge && `Student age: ${inquiry.studentAge}`,
    inquiry.preferredLocation && `Preferred location: ${inquiry.preferredLocation}`,
    `Interested in: ${inquiry.interestedIn}`,
    "",
    "Message:",
    inquiry.message,
  ]);
  return finishDelivery(saved, emailed);
}

const APPLICATION_FIELDS = ["name", "email", "phone", "jobOpeningId", "experience", "availability", "message", "company"] as const;
const PDF_SIGNATURE = "%PDF-";

/** The attached resume, if any, after checking it really is a PDF of an acceptable size. */
async function readResume(formData: FormData) {
  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_RESUME_BYTES) throw new Error("The resume must be a PDF of 4 MB or less.");
  // The browser's reported type is only a hint, so the file's own first bytes are checked too.
  const head = new TextDecoder().decode(await file.slice(0, PDF_SIGNATURE.length).arrayBuffer());
  if (head !== PDF_SIGNATURE) throw new Error("The resume must be a PDF file.");
  return file;
}

async function findOpenPosition(jobOpeningId: string) {
  if (jobOpeningId === GENERAL_APPLICATION) return null;
  const job = await db.jobOpening.findFirst({ where: { id: jobOpeningId, status: "PUBLISHED" }, select: { id: true, title: true } });
  if (!job) throw new Error("This position is no longer open. Please choose another one.");
  return job;
}

// Public (no session): the job application form on the Careers page. Sent as form data because
// it may carry a resume, which is stored as a private Cloudinary file only staff can open.
export async function submitJobApplication(formData: FormData) {
  const application = jobApplicationSchema.parse(
    Object.fromEntries(APPLICATION_FIELDS.map((name) => [name, formData.get(name) ?? undefined])),
  );
  if (application.company) return { sent: true };

  const senderKey = await getSenderKey();
  if (await isOverHourlyLimit(senderKey)) throw new Error(TOO_MANY);

  const job = await findOpenPosition(application.jobOpeningId);
  const resume = await readResume(formData);
  const resumePublicId = resume && (await uploadPrivateDocument(resume, "resume.pdf"));

  const position = job?.title ?? "General application";
  const saved = await saveInquiry(
    {
      name: application.name,
      email: application.email,
      phone: application.phone,
      interestedIn: JOB_APPLICATION_TOPIC,
      jobOpeningId: job?.id ?? null,
      jobTitle: job?.title ?? null,
      experience: application.experience,
      availability: application.availability || null,
      message: application.message ?? "",
      resumePublicId,
      resumeName: resume ? resume.name.slice(0, 200) : null,
    },
    senderKey,
  );
  if (saved.outcome === "unavailable" && resumePublicId) {
    // Nothing points at the file any more, so it is not kept.
    await deletePrivateDocument(resumePublicId).catch(() => {});
  }

  const emailed = await emailStaff(`Job application — ${position} — ${application.name}`, [
    "A new job application was sent from the website's Careers page.",
    "",
    `Position: ${position}`,
    `Name: ${application.name}`,
    `Email: ${application.email}`,
    `Phone: ${application.phone}`,
    application.availability && `Availability: ${application.availability}`,
    "",
    "Experience:",
    application.experience,
    ...(application.message ? ["", "Message:", application.message] : []),
    "",
    saved.outcome === "saved" && resumePublicId
      ? "A resume is attached. Open it from Job Applications in the Content Portal."
      : "No resume is attached.",
  ]);
  return finishDelivery(saved, emailed);
}
