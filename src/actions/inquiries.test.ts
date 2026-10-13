import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendAdminOperationalAlert: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  forwardedFor: vi.fn(),
}));

vi.mock("@/actions/email", () => ({ sendAdminOperationalAlert: mocks.sendAdminOperationalAlert }));
vi.mock("@/lib/db", () => ({ db: { inquiry: { count: mocks.count, create: mocks.create, update: mocks.update } } }));
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => (name === "x-forwarded-for" ? mocks.forwardedFor() : null) }),
}));

import { submitWebsiteInquiry } from "@/actions/inquiries";

const inquiry = {
  name: "Anu Sharma",
  email: "anu@example.test",
  phone: "",
  studentName: "Nia",
  studentAge: "9",
  interestedIn: "Bharatanatyam" as const,
  preferredLocation: "Elgin" as const,
  message: "Is there a beginner class?",
  company: "",
};

const emailFails = { sent: false, error: "SMTP is not configured", subject: "", text: "" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.sendAdminOperationalAlert.mockResolvedValue({ sent: true, subject: "", text: "" });
  mocks.forwardedFor.mockReturnValue("203.0.113.7, 10.0.0.1");
  mocks.count.mockResolvedValue(0);
  mocks.create.mockResolvedValue({ id: "inq-1" });
  mocks.update.mockResolvedValue({});
});

describe("website inquiry", () => {
  it("saves the inquiry for the portal, with blank fields stored as nothing", async () => {
    await expect(submitWebsiteInquiry(inquiry)).resolves.toEqual({ sent: true });

    const { data } = mocks.create.mock.calls[0][0];
    expect(data).toMatchObject({
      name: "Anu Sharma",
      email: "anu@example.test",
      phone: null,
      studentName: "Nia",
      interestedIn: "Bharatanatyam",
      message: "Is there a beginner class?",
    });
    expect(data).not.toHaveProperty("status");
  });

  it("emails the studio with the visitor's details and skips fields left blank", async () => {
    await submitWebsiteInquiry(inquiry);

    const alert = mocks.sendAdminOperationalAlert.mock.calls[0][0];
    expect(alert.subject).toBe("Website inquiry — Bharatanatyam — Anu Sharma");
    expect(alert.lines).toContain("Email: anu@example.test");
    expect(alert.lines).toContain("Student name: Nia");
    expect(alert.lines).toContain("Preferred location: Elgin");
    expect(alert.lines).toContain("Is there a beginner class?");
    expect(alert.lines.some((line: string) => line.startsWith("Phone:"))).toBe(false);
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "inq-1" }, data: { emailAlertSent: true } });
  });

  it.each([
    ["the email is not set up", () => mocks.sendAdminOperationalAlert.mockResolvedValue(emailFails)],
    ["the email service throws", () => mocks.sendAdminOperationalAlert.mockRejectedValue(new Error("connection refused"))],
  ])("still succeeds when %s, because the inquiry is saved", async (_, breakEmail) => {
    breakEmail();

    await expect(submitWebsiteInquiry(inquiry)).resolves.toEqual({ sent: true });
    expect(mocks.create).toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("falls back to the email alone when the inquiry cannot be saved", async () => {
    mocks.create.mockRejectedValue(new Error("relation does not exist"));

    await expect(submitWebsiteInquiry(inquiry)).resolves.toEqual({ sent: true });
    expect(mocks.sendAdminOperationalAlert).toHaveBeenCalled();
  });

  it("reports a failure only when the inquiry can be neither saved nor emailed", async () => {
    mocks.create.mockRejectedValue(new Error("relation does not exist"));
    mocks.sendAdminOperationalAlert.mockResolvedValue(emailFails);

    await expect(submitWebsiteInquiry(inquiry)).rejects.toThrow("could not be delivered");
  });

  it("stops a sender who has already sent five messages in the past hour", async () => {
    mocks.count.mockResolvedValue(5);

    await expect(submitWebsiteInquiry(inquiry)).rejects.toThrow("Too many messages");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sendAdminOperationalAlert).not.toHaveBeenCalled();
  });

  it("counts messages by a fingerprint of the sender's address, never the address itself", async () => {
    await submitWebsiteInquiry(inquiry);

    const { senderKey } = mocks.create.mock.calls[0][0].data;
    expect(senderKey).toMatch(/^[a-f0-9]{32}$/);
    expect(senderKey).not.toContain("203.0.113.7");
    expect(mocks.count.mock.calls[0][0].where).toMatchObject({ senderKey, createdAt: { gte: expect.any(Date) } });
  });

  it("does not limit a sender whose address is unknown", async () => {
    mocks.forwardedFor.mockReturnValue(null);

    await expect(submitWebsiteInquiry(inquiry)).resolves.toEqual({ sent: true });
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.create.mock.calls[0][0].data.senderKey).toBeNull();
  });

  it("drops automated submissions without saving or emailing", async () => {
    await expect(submitWebsiteInquiry({ ...inquiry, company: "Acme" })).resolves.toEqual({ sent: true });

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sendAdminOperationalAlert).not.toHaveBeenCalled();
  });

  it("rejects an inquiry without a valid email", async () => {
    await expect(submitWebsiteInquiry({ ...inquiry, email: "not-an-email" })).rejects.toThrow();

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sendAdminOperationalAlert).not.toHaveBeenCalled();
  });
});
