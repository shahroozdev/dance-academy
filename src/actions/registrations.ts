"use server";

import type { RegistrationRequestCreateInput } from "@/actions/registrations.schema";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { buildEnrollmentConfirmedEmail, buildRegistrationReceivedEmail } from "@/lib/email-templates";

// ---------- Queries ----------

export async function getRegistrationRequests(params?: {
  status?: "PENDING" | "PROCESSED" | "REJECTED";
  page?: number;
  pageSize?: number;
}) {
  const { status, page = 1, pageSize = 20 } = params ?? {};

  const where: Prisma.RegistrationRequestWhereInput = {};
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    db.registrationRequest.findMany({
      where,
      include: { requestedClass: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.registrationRequest.count({ where }),
  ]);

  return { data, total, pages: Math.ceil(total / pageSize) };
}

export type RegistrationRequestDetail = Awaited<ReturnType<typeof getRegistrationRequestById>>;

export async function getRegistrationRequestById(id: string) {
  return db.registrationRequest.findUniqueOrThrow({
    where: { id },
    include: { requestedClass: true, matchedFamily: true },
  });
}

export type RegistrationMatchPlan = {
  family: { action: "match" | "create"; id: string | null; name: string };
  student: { action: "match" | "create"; id: string | null };
};

// Read-only preview of what approval would do, so the admin can review before committing.
export async function previewRegistrationApproval(id: string): Promise<RegistrationMatchPlan> {
  const request = await db.registrationRequest.findUniqueOrThrow({ where: { id } });
  return resolveMatchPlan(db, request);
}

// ---------- Mutations ----------

export async function createRegistrationRequest(data: RegistrationRequestCreateInput) {
  const request = await db.registrationRequest.create({
    data: {
      parentGuardianName: data.parentGuardianName,
      parentEmail: data.parentEmail || null,
      parentPhone: data.parentPhone,
      studentFullName: data.studentFullName,
      dob: data.dob ? new Date(data.dob) : null,
      gender: data.gender ?? null,
      requestedClassId: data.requestedClassId,
      previousDanceExperience: data.previousDanceExperience || null,
      emergencyContactName: data.emergencyContactName,
      emergencyContactRelationship: data.emergencyContactRelationship,
      emergencyPhone: data.emergencyPhone,
      studioPolicyAgreement: data.studioPolicyAgreement,
      photoVideoConsent: data.photoVideoConsent,
    },
    include: { requestedClass: { select: { name: true } } },
  });

  // Best-effort — sendEmail never throws, so a slow/misconfigured mail server can't fail the
  // registration itself. Awaited (not fire-and-forget) so it actually completes before this
  // server action returns, since a serverless runtime can suspend right after the response.
  if (request.parentEmail && request.requestedClass) {
    const { subject, text } = buildRegistrationReceivedEmail({
      parentGuardianName: request.parentGuardianName,
      studentFullName: request.studentFullName,
      className: request.requestedClass.name,
    });
    await sendEmail({ to: request.parentEmail, subject, text });
  }

  return request;
}

export async function rejectRegistrationRequest(id: string) {
  return db.registrationRequest.update({
    where: { id },
    data: { status: "REJECTED", processedAt: new Date() },
  });
}

export async function approveRegistrationRequest(id: string) {
  const { processedRequest, familyEmail, studentFullName, classId } = await db.$transaction(async (tx) => {
    const request = await tx.registrationRequest.findUniqueOrThrow({ where: { id } });
    if (request.status !== "PENDING") {
      throw new Error("This registration request has already been processed.");
    }
    if (!request.requestedClassId) {
      throw new Error("This registration request has no requested class.");
    }

    const plan = await resolveMatchPlan(tx, request);

    const family =
      plan.family.action === "match"
        ? await tx.family.findUniqueOrThrow({ where: { id: plan.family.id! } })
        : await tx.family.create({
            data: {
              familyName: plan.family.name,
              parentGuardianName: request.parentGuardianName,
              email: request.parentEmail,
              phone: request.parentPhone,
            },
          });

    const student =
      plan.student.action === "match"
        ? await tx.student.findUniqueOrThrow({ where: { id: plan.student.id! } })
        : await tx.student.create({
            data: {
              fullName: request.studentFullName,
              familyId: family.id,
              dob: request.dob,
              gender: request.gender,
              emergencyContactName: request.emergencyContactName,
              emergencyContactRelationship: request.emergencyContactRelationship,
              emergencyPhone: request.emergencyPhone,
            },
          });

    // Backfill emergency contact on a matched (pre-existing) student only if it's missing —
    // never silently overwrite info an admin may have already corrected.
    if (plan.student.action === "match" && !student.emergencyContactName) {
      await tx.student.update({
        where: { id: student.id },
        data: {
          emergencyContactName: request.emergencyContactName,
          emergencyContactRelationship: request.emergencyContactRelationship,
          emergencyPhone: request.emergencyPhone,
        },
      });
    }

    const existingEnrollment = await tx.enrollment.findFirst({
      where: { studentId: student.id, classId: request.requestedClassId, status: "ACTIVE" },
    });
    if (!existingEnrollment) {
      await tx.enrollment.create({
        data: { studentId: student.id, classId: request.requestedClassId },
      });
    }

    const processedRequest = await tx.registrationRequest.update({
      where: { id },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        matchedFamilyId: family.id,
        matchedStudentId: student.id,
      },
    });

    return {
      processedRequest,
      familyEmail: family.email,
      studentFullName: student.fullName,
      classId: request.requestedClassId,
    };
  });

  // Sent after the transaction commits — an SMTP call has no business holding a DB transaction open.
  if (familyEmail) {
    const requestedClass = await db.class.findUnique({ where: { id: classId! }, select: { name: true } });
    if (requestedClass) {
      const { subject, text } = buildEnrollmentConfirmedEmail({
        parentGuardianName: processedRequest.parentGuardianName,
        studentFullName,
        className: requestedClass.name,
      });
      await sendEmail({ to: familyEmail, subject, text });
    }
  }

  return processedRequest;
}

function deriveFamilyName(parentGuardianName: string): string {
  const parts = parentGuardianName.trim().split(/\s+/);
  const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  return `${surname} Family`;
}

async function resolveMatchPlan(
  client: Prisma.TransactionClient,
  request: { parentGuardianName: string; parentPhone: string; parentEmail: string | null; studentFullName: string },
): Promise<RegistrationMatchPlan> {
  const existingFamily = await client.family.findFirst({
    where: {
      OR: [
        { phone: request.parentPhone },
        ...(request.parentEmail ? [{ email: request.parentEmail }] : []),
      ],
    },
  });

  if (!existingFamily) {
    return {
      family: { action: "create", id: null, name: deriveFamilyName(request.parentGuardianName) },
      student: { action: "create", id: null },
    };
  }

  const existingStudent = await client.student.findFirst({
    where: { familyId: existingFamily.id, fullName: { equals: request.studentFullName, mode: "insensitive" } },
  });

  return {
    family: { action: "match", id: existingFamily.id, name: existingFamily.familyName },
    student: existingStudent
      ? { action: "match", id: existingStudent.id }
      : { action: "create", id: null },
  };
}
