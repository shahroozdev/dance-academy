"use server";

import { createHash } from "node:crypto";

import { headers } from "next/headers";

import { sendAdminOperationalAlert } from "@/actions/email";
import { websiteInquirySchema, type WebsiteInquiryInput } from "@/actions/inquiries.schema";
import { db } from "@/lib/db";

const MAX_INQUIRIES_PER_HOUR = 5;
const ONE_HOUR_MS = 60 * 60 * 1000;

type ParsedInquiry = ReturnType<typeof websiteInquirySchema.parse>;

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

type SaveResult = { outcome: "saved"; id: string } | { outcome: "limited" } | { outcome: "unavailable" };

/** Saves the inquiry for the Content Portal's Inquiries list, unless this sender has sent too many. */
async function saveInquiry(inquiry: ParsedInquiry, senderKey: string | null): Promise<SaveResult> {
  try {
    if (senderKey) {
      const recent = await db.inquiry.count({
        where: { senderKey, createdAt: { gte: new Date(Date.now() - ONE_HOUR_MS) } },
      });
      if (recent >= MAX_INQUIRIES_PER_HOUR) return { outcome: "limited" };
    }
    const saved = await db.inquiry.create({
      data: {
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone || null,
        studentName: inquiry.studentName || null,
        studentAge: inquiry.studentAge || null,
        interestedIn: inquiry.interestedIn,
        preferredLocation: inquiry.preferredLocation || null,
        message: inquiry.message,
        senderKey,
      },
      select: { id: true },
    });
    return { outcome: "saved", id: saved.id };
  } catch (error) {
    // The email alert below is then the only record, so its failure is reported to the visitor.
    console.error("[website] An inquiry could not be saved:", error instanceof Error ? error.message : error);
    return { outcome: "unavailable" };
  }
}

async function emailStaff(inquiry: ParsedInquiry) {
  const optionalLines = [
    inquiry.phone && `Phone: ${inquiry.phone}`,
    inquiry.studentName && `Student name: ${inquiry.studentName}`,
    inquiry.studentAge && `Student age: ${inquiry.studentAge}`,
    inquiry.preferredLocation && `Preferred location: ${inquiry.preferredLocation}`,
  ].filter((line): line is string => !!line);

  try {
    const result = await sendAdminOperationalAlert({
      setting: "registrationAlertEnabled",
      subject: `Website inquiry — ${inquiry.interestedIn} — ${inquiry.name}`,
      lines: [
        "A new inquiry was sent from the website contact form.",
        "",
        `Name: ${inquiry.name}`,
        `Email: ${inquiry.email}`,
        ...optionalLines,
        `Interested in: ${inquiry.interestedIn}`,
        "",
        "Message:",
        inquiry.message,
      ],
    });
    return result.sent;
  } catch (error) {
    console.error("[website] The inquiry email alert failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

// Public (no session): the website contact form. Each inquiry is saved for the Content Portal's
// Inquiries list and the studio is emailed as well. Saving is what counts: once the inquiry is
// saved the visitor is told it was sent even if the email fails, because nothing is lost. Only
// when it can be neither saved nor emailed is the failure reported back to the visitor.
export async function submitWebsiteInquiry(data: WebsiteInquiryInput) {
  const inquiry = websiteInquirySchema.parse(data);
  if (inquiry.company) return { sent: true };

  const saved = await saveInquiry(inquiry, await getSenderKey());
  if (saved.outcome === "limited") throw new Error("Too many messages were sent from this connection. Please try again later.");

  const emailed = await emailStaff(inquiry);
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
