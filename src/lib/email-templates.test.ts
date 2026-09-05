import { describe, expect, it } from "vitest";

import { EMAIL_TEMPLATES, renderEmailTemplate, renderPlaceholders } from "@/lib/email-templates";

describe("renderPlaceholders", () => {
  it("substitutes every known {{key}} token", () => {
    expect(renderPlaceholders("Hi {{name}}, welcome to {{studio}}!", { name: "Anu", studio: "Malhaar" })).toBe(
      "Hi Anu, welcome to Malhaar!",
    );
  });

  it("leaves an unknown token untouched instead of silently dropping it", () => {
    expect(renderPlaceholders("Hi {{name}}, {{typo}}", { name: "Anu" })).toBe("Hi Anu, {{typo}}");
  });
});

describe("renderEmailTemplate", () => {
  it("renders the REGISTRATION_RECEIVED default with the studio's own studioName, not a hardcoded one", () => {
    const template = EMAIL_TEMPLATES.REGISTRATION_RECEIVED;
    const { subject, text } = renderEmailTemplate(
      { subject: template.defaultSubject, body: template.defaultBody },
      { parentName: "Anu", studentName: "Nia Sharma", className: "Bharatanatyam Beginner", studioName: "Test Studio" },
    );
    expect(subject).toBe("We received your registration — Test Studio");
    expect(text.startsWith("Hi Anu,")).toBe(true);
    expect(text).toContain("Nia Sharma");
    expect(text).toContain("Bharatanatyam Beginner");
    expect(text).toContain("Test Studio");
  });

  it("renders the ENROLLMENT_CONFIRMED default", () => {
    const template = EMAIL_TEMPLATES.ENROLLMENT_CONFIRMED;
    const { subject, text } = renderEmailTemplate(
      { subject: template.defaultSubject, body: template.defaultBody },
      { parentName: "Priya", studentName: "Meera Nair", className: "Kathak Intermediate", studioName: "Malhaar Dance Company" },
    );
    expect(subject).toBe("Meera Nair is enrolled — Malhaar Dance Company");
    expect(text.startsWith("Hi Priya,")).toBe(true);
    expect(text).toContain("Kathak Intermediate");
  });

  it("splices a pre-rendered feeSummary block into MONTHLY_FEE_NOTICE", () => {
    const template = EMAIL_TEMPLATES.MONTHLY_FEE_NOTICE;
    const { subject, text } = renderEmailTemplate(
      { subject: template.defaultSubject, body: template.defaultBody },
      {
        parentName: "Anu",
        monthLabel: "September 2026",
        feeSummary: "Nia – $144.40\nLeia – $76.00\nTotal family amount due: $220.40",
        studioName: "Malhaar Dance Company",
      },
    );
    expect(subject).toBe("September 2026 Dance Fees — Malhaar Dance Company");
    expect(text).toContain("Nia – $144.40");
    expect(text).toContain("Total family amount due: $220.40");
  });
});
