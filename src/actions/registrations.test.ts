import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  sendEmail: vi.fn(),
  db: {
    registrationRequest: { findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn() },
    family: { findMany: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn() },
    student: { findFirst: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn() },
    class: { findFirst: vi.fn(), findUniqueOrThrow: vi.fn(), findUnique: vi.fn() },
    danceProgram: { findFirst: vi.fn() },
    enrollment: { findFirst: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/actions/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/actions/transaction", () => ({ serializableTransaction: (work: (db: typeof mocks.db) => Promise<unknown>) => work(mocks.db) }));
vi.mock("@/actions/email", () => ({ sendTemplatedEmail: mocks.sendEmail, sendAdminOperationalAlert: vi.fn() }));

import { approveRegistrationRequest, createRegistrationRequest, getRegistrationFamilyOptions, previewRegistrationApproval, sendRegistrationEnrollmentConfirmation } from "@/actions/registrations";

const family = { id: "family", familyName: "Sharma Family", parentGuardianName: "Mother Sharma", phone: "5551234567", email: "mother@example.test", isActive: true };
const request = { id: "request", status: "PENDING", parentGuardianName: "Father Sharma", parentPhone: "5559998888", parentEmail: "father@example.test", studentFullName: "Leia Sharma", requestedProgramId: "program", requestedClassId: "class", emergencyContactName: "Father Sharma" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin" });
  mocks.db.registrationRequest.findUniqueOrThrow.mockResolvedValue(request);
  mocks.db.registrationRequest.update.mockImplementation(async ({ data }) => ({ ...request, ...data }));
  mocks.db.family.findMany.mockResolvedValue([family]);
  mocks.db.family.findUnique.mockResolvedValue(family);
  mocks.db.family.findUniqueOrThrow.mockResolvedValue(family);
  mocks.db.student.findFirst.mockResolvedValue(null);
  mocks.db.student.create.mockResolvedValue({ id: "new-student", fullName: request.studentFullName, isActive: true });
  mocks.db.class.findUniqueOrThrow.mockResolvedValue({ id: "class", programId: "program", isActive: true });
  mocks.db.class.findUnique.mockResolvedValue({ name: "Kathak" });
  mocks.db.danceProgram.findFirst.mockResolvedValue({ id: "program", name: "Kathak" });
  mocks.db.enrollment.findFirst.mockResolvedValue(null);
});

describe("public program-only registration", () => {
  it("stores the requested program without assigning a class", async () => {
    mocks.db.registrationRequest.create.mockImplementation(async ({ data }) => ({
      id: "new-request",
      ...data,
    }));
    mocks.sendEmail.mockResolvedValue({ sent: true });

    await createRegistrationRequest({
      parentGuardianName: "Mother Sharma",
      parentEmail: "mother@example.test",
      parentPhone: "+12025550123",
      studentFullName: "Nia Sharma",
      dob: "2018-01-02",
      gender: "FEMALE",
      requestedProgramId: "program",
      previousDanceExperience: "Beginner",
      emergencyContactName: "Father Sharma",
      emergencyContactRelationship: "Father",
      emergencyPhone: "+12025550124",
      studioPolicyAgreement: true,
      photoVideoConsent: true,
    });

    expect(mocks.db.registrationRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ requestedProgramId: "program" }),
    });
    expect(mocks.db.registrationRequest.create.mock.calls[0][0].data).not.toHaveProperty("requestedClassId");
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      "REGISTRATION_RECEIVED",
      expect.objectContaining({ className: "Kathak" }),
      "mother@example.test",
    );
    expect(mocks.db.enrollment.create).not.toHaveBeenCalled();
  });
});

describe("registration family selection", () => {
  it("retains automatic creation when neither parent contact matches", async () => {
    expect(await previewRegistrationApproval("request")).toMatchObject({ family: { action: "create", id: null } });
  });

  it("retains automatic matching by either contact", async () => {
    mocks.db.registrationRequest.findUniqueOrThrow.mockResolvedValue({ ...request, parentEmail: family.email });
    expect(await previewRegistrationApproval("request")).toMatchObject({ family: { action: "match", id: family.id } });
  });

  it("previews an explicit family despite entirely different parent contacts", async () => {
    expect(await previewRegistrationApproval("request", family.id)).toEqual({
      family: { action: "match", id: family.id, name: family.familyName },
      student: { action: "create", id: null },
    });
    expect(mocks.db.family.findMany).not.toHaveBeenCalled();
    expect(mocks.db.student.findFirst).toHaveBeenCalledWith({ where: { familyId: family.id, fullName: { equals: request.studentFullName, mode: "insensitive" } } });
    expect(mocks.db.student.create).not.toHaveBeenCalled();
  });

  it("lets staff resolve ambiguous automatic matches by explicitly selecting a family", async () => {
    mocks.db.family.findMany.mockResolvedValue([{ ...family, phone: request.parentPhone }, { ...family, id: "other", email: request.parentEmail }]);
    await expect(previewRegistrationApproval("request")).rejects.toThrow("more than one family");
    expect(await previewRegistrationApproval("request", family.id)).toMatchObject({ family: { id: family.id } });
  });

  it.each([null, { ...family, isActive: false }])("rejects unavailable selected families in preview and approval", async (selected) => {
    mocks.db.family.findUnique.mockResolvedValue(selected);
    await expect(previewRegistrationApproval("request", family.id)).rejects.toThrow("unavailable or inactive");
    await expect(approveRegistrationRequest("request", "class", family.id)).rejects.toThrow("unavailable or inactive");
    expect(mocks.db.student.create).not.toHaveBeenCalled();
    expect(mocks.db.registrationRequest.update).not.toHaveBeenCalled();
  });

  it("creates the sibling in the chosen family and records the staff decision", async () => {
    const result = await approveRegistrationRequest("request", "class", family.id);
    expect(mocks.db.family.create).not.toHaveBeenCalled();
    expect(mocks.db.student.create).toHaveBeenCalledWith({ data: expect.objectContaining({ familyId: family.id, fullName: request.studentFullName }) });
    expect(mocks.db.enrollment.create).toHaveBeenCalledWith({ data: { studentId: "new-student", classId: "class" } });
    expect(result).toMatchObject({ matchedFamilyId: family.id, matchedStudentId: "new-student", processedByAdminId: "admin", status: "PROCESSED" });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("reuses an existing student and active enrollment inside the chosen family", async () => {
    const student = { id: "existing-student", isActive: true, fullName: request.studentFullName, emergencyContactName: "Saved contact" };
    mocks.db.student.findFirst.mockResolvedValue(student);
    mocks.db.student.findUniqueOrThrow.mockResolvedValue(student);
    mocks.db.enrollment.findFirst.mockResolvedValue({ id: "existing-enrollment" });
    await approveRegistrationRequest("request", "class", family.id);
    expect(mocks.db.student.create).not.toHaveBeenCalled();
    expect(mocks.db.enrollment.create).not.toHaveBeenCalled();
  });

  it("checks again when a family becomes inactive after preview", async () => {
    await previewRegistrationApproval("request", family.id);
    mocks.db.family.findUnique.mockResolvedValue({ ...family, isActive: false });
    await expect(approveRegistrationRequest("request", "class", family.id)).rejects.toThrow("inactive");
  });

  it("rejects repeated approval", async () => {
    mocks.db.registrationRequest.findUniqueOrThrow.mockResolvedValue({ ...request, status: "PROCESSED" });
    await expect(approveRegistrationRequest("request", "class", family.id)).rejects.toThrow("already been processed");
  });

  it("rejects a final class outside the program selected by the parent", async () => {
    mocks.db.class.findUniqueOrThrow.mockResolvedValue({ id: "other-class", programId: "other-program", isActive: true });

    await expect(approveRegistrationRequest("request", "other-class", family.id)).rejects.toThrow(
      "Select a class from the dance program requested by the parent.",
    );
    expect(mocks.db.student.create).not.toHaveBeenCalled();
    expect(mocks.db.enrollment.create).not.toHaveBeenCalled();
  });

  it("validates the family ID instead of treating an empty selection as automatic", async () => {
    await expect(approveRegistrationRequest("request", "class", "")).rejects.toThrow();
    expect(mocks.db.registrationRequest.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("offers active families with identifying contact details", async () => {
    await getRegistrationFamilyOptions();
    expect(mocks.db.family.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true }, select: expect.objectContaining({ id: true, phone: true, email: true }) }));
  });

  it("sends enrollment confirmation only through the separate staff action", async () => {
    mocks.db.registrationRequest.findUniqueOrThrow.mockResolvedValue({
      ...request,
      status: "PROCESSED",
      enrollmentConfirmationSentAt: null,
      matchedFamilyId: family.id,
      matchedFamily: { email: family.email },
      requestedClass: { name: "Kathak" },
    });
    mocks.sendEmail.mockResolvedValue({ sent: true });

    await sendRegistrationEnrollmentConfirmation("request");

    expect(mocks.sendEmail).toHaveBeenCalledWith(
      "ENROLLMENT_CONFIRMED",
      expect.objectContaining({ studentName: request.studentFullName, className: "Kathak" }),
      family.email,
    );
    expect(mocks.db.registrationRequest.update).toHaveBeenCalledWith({
      where: { id: "request" },
      data: { enrollmentConfirmationSentAt: expect.any(Date) },
    });
  });

  it("does not mark a failed enrollment confirmation as sent", async () => {
    mocks.db.registrationRequest.findUniqueOrThrow.mockResolvedValue({
      ...request,
      status: "PROCESSED",
      enrollmentConfirmationSentAt: null,
      matchedFamilyId: family.id,
      matchedFamily: { email: family.email },
      requestedClass: { name: "Kathak" },
    });
    mocks.sendEmail.mockResolvedValue({ sent: false, error: "SMTP unavailable" });

    await expect(sendRegistrationEnrollmentConfirmation("request")).rejects.toThrow("SMTP unavailable");
    expect(mocks.db.registrationRequest.update).not.toHaveBeenCalled();
  });
});
