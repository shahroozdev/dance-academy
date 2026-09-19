"use server";

import { requireAdmin } from "@/actions/access";
import { recalculateAffectedBills } from "@/actions/billing-impact";
import { sendAdminOperationalAlert, sendTemplatedEmail } from "@/actions/email";
import { enrollmentStartDateUpdateSchema } from "@/actions/enrollments.schema";
import { registrationRequestCreateSchema } from "@/actions/registrations.schema";
import type { RegistrationRequestCreateInput } from "@/actions/registrations.schema";
import { serializableTransaction } from "@/actions/transaction";
import { booleanSchema, idSchema , validateListQuery } from "@/actions/validation.schema";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { enrollmentCalendarDate } from "@/lib/enrollment-date";
import { matchRegistrationFamily } from "@/lib/family-matching";
import { firstName } from "@/lib/notifications";
import {
  DEFAULT_REGISTRATION_AGREEMENT_LABEL,
  DEFAULT_REGISTRATION_POLICY_CONTENT,
  DEFAULT_REGISTRATION_POLICY_TITLE,
} from "@/lib/registration-policy";

// ---------- Queries ----------

export async function getRegistrationRequests(params?: {
  status?: "PENDING" | "PROCESSED" | "REJECTED";
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();
  validateListQuery(params, []);
  const { status, page = 1, pageSize = 20 } = params ?? {};

  const where: Prisma.RegistrationRequestWhereInput = {};
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    db.registrationRequest.findMany({
      where,
      include: {
        requestedProgram: { select: { id: true, name: true } },
        requestedClass: { select: { id: true, name: true, program: { select: { name: true } } } },
      },
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
  await requireAdmin();
  id = idSchema.parse(id);
  return db.registrationRequest.findUniqueOrThrow({
    where: { id },
    // requestedClass is select-only (never `true`) — Class.standardRate is a Decimal, which
    // can't cross the server-action boundary to a Client Component un-serialized, and nothing
    // in the UI needs it here anyway (only the class name is displayed).
    include: {
      requestedProgram: { select: { id: true, name: true } },
      requestedClass: { select: { id: true, name: true, program: { select: { name: true } } } },
      matchedFamily: true,
    },
  });
}

export type RegistrationMatchPlan = {
  family: { action: "match" | "create"; id: string | null; name: string };
  student: { action: "match" | "create"; id: string | null };
};

// Read-only preview of what approval would do, so the admin can review before committing.
export async function getRegistrationFamilyOptions(params?: { search?: string; page?: number; pageSize?: number }) {
  await requireAdmin();
  validateListQuery(params, []);
  const { search, page = 1, pageSize = 25 } = params ?? {};
  const where: Prisma.FamilyWhereInput = {
    isActive: true,
    ...(search && {
      OR: [
        { familyName: { contains: search, mode: "insensitive" } },
        { parentGuardianName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };
  const [data, total] = await Promise.all([
    db.family.findMany({
      where,
      select: { id: true, familyName: true, parentGuardianName: true, phone: true, email: true },
      orderBy: [{ familyName: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.family.count({ where }),
  ]);
  return { data, total, page, pages: Math.ceil(total / pageSize) };
}

export async function getRegistrationAssignmentClasses() {
  await requireAdmin();
  return db.class.findMany({
    where: { isActive: true },
    select: { id: true, name: true, firstClassDate: true, program: { select: { id: true, name: true } } },
    orderBy: [{ program: { name: "asc" } }, { name: "asc" }],
  });
}

export async function previewRegistrationApproval(id: string, familyId?: string): Promise<RegistrationMatchPlan> {
  await requireAdmin();
  id = idSchema.parse(id);
  familyId = idSchema.optional().parse(familyId);
  const request = await db.registrationRequest.findUniqueOrThrow({ where: { id } });
  return resolveMatchPlan(db, request, familyId);
}

// ---------- Mutations ----------

export async function createRegistrationRequest(data: RegistrationRequestCreateInput) {
  data = registrationRequestCreateSchema.parse(data);
  const [offeredProgram, policy] = await Promise.all([
    db.danceProgram.findFirst({
      where: { id: data.requestedProgramId, isActive: true, classes: { some: { isActive: true } } },
      select: { id: true, name: true },
    }),
    db.studioSettings.findUnique({
      where: { id: "default" },
      select: {
        registrationPolicyTitle: true,
        registrationPolicyContent: true,
        registrationPolicyAgreementLabel: true,
        registrationPolicyVersion: true,
      },
    }),
  ]);
  if (!offeredProgram) throw new Error("This dance program is no longer accepting registration.");
  const acceptedPolicy = policy ?? {
    registrationPolicyTitle: DEFAULT_REGISTRATION_POLICY_TITLE,
    registrationPolicyContent: DEFAULT_REGISTRATION_POLICY_CONTENT,
    registrationPolicyAgreementLabel: DEFAULT_REGISTRATION_AGREEMENT_LABEL,
    registrationPolicyVersion: 1,
  };
  const request = await db.registrationRequest.create({
    data: {
      parentGuardianName: data.parentGuardianName,
      parentEmail: data.parentEmail || null,
      parentPhone: data.parentPhone,
      studentFullName: data.studentFullName,
      dob: data.dob ? new Date(data.dob) : null,
      gender: data.gender ?? null,
      requestedProgramId: offeredProgram.id,
      previousDanceExperience: data.previousDanceExperience || null,
      emergencyContactName: data.emergencyContactName,
      emergencyContactRelationship: data.emergencyContactRelationship,
      emergencyPhone: data.emergencyPhone,
      studioPolicyAgreement: data.studioPolicyAgreement,
      photoVideoConsent: data.photoVideoConsent,
      policyTitleSnapshot: acceptedPolicy.registrationPolicyTitle,
      policyContentSnapshot: acceptedPolicy.registrationPolicyContent,
      policyAgreementLabelSnapshot: acceptedPolicy.registrationPolicyAgreementLabel,
      policyVersion: acceptedPolicy.registrationPolicyVersion,
      policyAgreedAt: new Date(),
    },
  });

  // Best-effort — sendTemplatedEmail never throws, so a slow/misconfigured mail server can't fail
  // the registration itself. Awaited (not fire-and-forget) so it actually completes before this
  // server action returns, since a serverless runtime can suspend right after the response.
  if (request.parentEmail) {
    await sendTemplatedEmail(
      "REGISTRATION_RECEIVED",
      {
        parentName: firstName(request.parentGuardianName),
        studentName: request.studentFullName,
        className: offeredProgram.name,
      },
      request.parentEmail,
    );
  }
  await sendAdminOperationalAlert({
    setting: "registrationAlertEnabled",
    subject: `New registration received — ${request.studentFullName}`,
    lines: ["A new registration is ready for review.", "", `Student: ${request.studentFullName}`, `Parent/guardian: ${request.parentGuardianName}`, `Requested dance program: ${offeredProgram.name}`],
  });

  return request;
}

export async function rejectRegistrationRequest(id: string) {
  const admin = await requireAdmin();
  id = idSchema.parse(id);
  return db.registrationRequest.update({
    where: { id, status: "PENDING" },
    data: { status: "REJECTED", processedAt: new Date(), processedByAdminId: admin.id },
  });
}

export async function approveRegistrationRequest(
  id: string,
  classId: string,
  firstBillableDate: string,
  familyId?: string,
  sendEmailNow = false,
) {
  const admin = await requireAdmin();
  id = idSchema.parse(id);
  classId = idSchema.parse(classId);
  const { startDate } = enrollmentStartDateUpdateSchema.parse({ startDate: firstBillableDate });
  const enrollmentStartDate = new Date(`${startDate}T00:00:00.000Z`);
  familyId = idSchema.optional().parse(familyId);
  sendEmailNow = booleanSchema.parse(sendEmailNow);
  const processedRequest = await serializableTransaction(async (tx) => {
    const request = await tx.registrationRequest.findUniqueOrThrow({ where: { id } });
    if (request.status !== "PENDING") {
      throw new Error("This registration request has already been processed.");
    }
    const requestedClass = await tx.class.findUniqueOrThrow({ where: { id: classId } });
    if (!requestedClass.isActive) throw new Error("This class is inactive. Update the registration before approving it.");
    if (enrollmentStartDate < enrollmentCalendarDate(requestedClass.firstClassDate)) {
      throw new Error("The first billable date cannot be before the class's first class date.");
    }
    if (request.requestedProgramId && requestedClass.programId !== request.requestedProgramId) {
      throw new Error("Select a class from the dance program requested by the parent.");
    }
    const plan = await resolveMatchPlan(tx, request, familyId);

    const family =
      plan.family.action === "match"
        ? await tx.family.findUniqueOrThrow({ where: { id: plan.family.id! } })
        : await tx.family.create({
            data: {
              familyName: plan.family.name,
              parentGuardianName: request.parentGuardianName,
              email: request.parentEmail,
              phone: request.parentPhone,
              guardians: {
                create: {
                  name: request.parentGuardianName,
                  email: request.parentEmail,
                  phone: request.parentPhone,
                  isPrimary: true,
                  receivesNotifications: true,
                },
              },
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
              joinDate: request.createdAt,
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

    if (!family.isActive || !student.isActive) throw new Error("Reactivate the matched family and student before approving this registration.");

    const existingEnrollment = await tx.enrollment.findFirst({
      where: { studentId: student.id, classId, status: "ACTIVE" },
    });
    if (!existingEnrollment) {
      await tx.enrollment.create({
        data: { studentId: student.id, classId, startDate: enrollmentStartDate },
      });
    }

    const processedRequest = await tx.registrationRequest.update({
      where: { id },
      data: {
        status: "PROCESSED",
        processedByAdminId: admin.id,
        processedAt: new Date(),
        matchedFamilyId: family.id,
        matchedStudentId: student.id,
        requestedClassId: classId,
      },
    });

    return processedRequest;
  });

  if (processedRequest.matchedFamilyId) {
    await recalculateAffectedBills({ student: { familyId: processedRequest.matchedFamilyId } });
  }

  if (!sendEmailNow) return { ...processedRequest, enrollmentEmail: { requested: false, sent: false, error: null } };

  try {
    await sendEnrollmentConfirmation(id);
    return { ...processedRequest, enrollmentEmail: { requested: true, sent: true, error: null } };
  } catch (error) {
    return {
      ...processedRequest,
      enrollmentEmail: {
        requested: true,
        sent: false,
        error: error instanceof Error ? error.message : "The enrollment confirmation email could not be sent.",
      },
    };
  }
}

export async function sendRegistrationEnrollmentConfirmation(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  return sendEnrollmentConfirmation(id);
}

async function sendEnrollmentConfirmation(id: string) {
  const request = await db.registrationRequest.findUniqueOrThrow({
    where: { id },
    include: {
      requestedClass: { select: { name: true } },
      matchedFamily: { select: { email: true } },
    },
  });
  if (request.status !== "PROCESSED" || !request.requestedClass || !request.matchedFamilyId) {
    throw new Error("Finalize the student's class enrollment before sending confirmation.");
  }
  if (request.enrollmentConfirmationSentAt) {
    throw new Error("The enrollment confirmation has already been sent.");
  }
  if (!request.matchedFamily?.email) {
    throw new Error("Add an email address to the family before sending confirmation.");
  }

  const result = await sendTemplatedEmail(
    "ENROLLMENT_CONFIRMED",
    {
      parentName: firstName(request.parentGuardianName),
      studentName: request.studentFullName,
      className: request.requestedClass.name,
    },
    request.matchedFamily.email,
  );
  if (!result.sent) throw new Error(result.error ?? "The enrollment confirmation email could not be sent.");

  return db.registrationRequest.update({
    where: { id },
    data: { enrollmentConfirmationSentAt: new Date() },
  });
}

function deriveFamilyName(parentGuardianName: string): string {
  const parts = parentGuardianName.trim().split(/\s+/);
  const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  return `${surname} Family`;
}

async function resolveMatchPlan(
  client: Prisma.TransactionClient,
  request: { parentGuardianName: string; parentPhone: string; parentEmail: string | null; studentFullName: string },
  familyId?: string,
): Promise<RegistrationMatchPlan> {
  // An explicit staff choice takes priority over contact matching, including ambiguous contacts.
  // Re-read it within approval's transaction so a stale preview cannot authorize an inactive family.
  let existingFamily;
  if (familyId !== undefined) {
    existingFamily = await client.family.findUnique({ where: { id: familyId } });
    if (!existingFamily?.isActive) throw new Error("The selected family is unavailable or inactive. Choose an active family.");
  } else {
    const families = await client.family.findMany({ select: { id: true, phone: true, email: true, familyName: true } });
    existingFamily = matchRegistrationFamily(families, request.parentPhone, request.parentEmail);
  }

  if (!existingFamily) {
    return {
      family: { action: "create", id: null, name: deriveFamilyName(request.parentGuardianName) },
      student: { action: "create", id: null },
    };
  }

  const existingStudent = await client.student.findFirst({
    where: { familyId: existingFamily.id, fullName: { equals: request.studentFullName.trim(), mode: "insensitive" } },
  });

  return {
    family: { action: "match", id: existingFamily.id, name: existingFamily.familyName },
    student: existingStudent
      ? { action: "match", id: existingStudent.id }
      : { action: "create", id: null },
  };
}
