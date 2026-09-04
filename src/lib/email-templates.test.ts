import { describe, expect, it } from "vitest";

import { buildEnrollmentConfirmedEmail, buildRegistrationReceivedEmail } from "@/lib/email-templates";

describe("buildRegistrationReceivedEmail", () => {
  it("greets by first name and names the student and class", () => {
    const { subject, text } = buildRegistrationReceivedEmail({
      parentGuardianName: "Anu Sharma",
      studentFullName: "Nia Sharma",
      className: "Bharatanatyam Beginner",
    });
    expect(subject).toBe("We received your registration — Malhaar Dance Company");
    expect(text.startsWith("Hi Anu,")).toBe(true);
    expect(text).toContain("Nia Sharma");
    expect(text).toContain("Bharatanatyam Beginner");
  });
});

describe("buildEnrollmentConfirmedEmail", () => {
  it("greets by first name and confirms the specific class", () => {
    const { subject, text } = buildEnrollmentConfirmedEmail({
      parentGuardianName: "Priya Nair",
      studentFullName: "Meera Nair",
      className: "Kathak Intermediate",
    });
    expect(subject).toBe("Meera Nair is enrolled — Malhaar Dance Company");
    expect(text.startsWith("Hi Priya,")).toBe(true);
    expect(text).toContain("Kathak Intermediate");
  });
});
