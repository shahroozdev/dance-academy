import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findSettings: vi.fn(),
  findOwner: vi.fn(),
  findTemplate: vi.fn(),
  sendEmail: vi.fn(),
  decryptSecret: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    studioSettings: { findUnique: mocks.findSettings },
    adminUser: { findFirst: mocks.findOwner },
    emailTemplate: { findUnique: mocks.findTemplate },
  },
}));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/crypto", () => ({ decryptSecret: mocks.decryptSecret }));

import { sendBillingReadyAlert, sendParentNotificationConfirmation } from "@/actions/email";

const summary = { created: 4, updated: 2, skipped: 1 };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findOwner.mockResolvedValue({ email: "owner@example.test" });
});

describe("parent-notification admin confirmation", () => {
  it("includes a checkmark, family, month, and delivery method", async () => {
    mocks.findSettings.mockResolvedValue(null);
    const result = await sendParentNotificationConfirmation({
      familyName: "Sharma Family",
      month: new Date("2026-09-01"),
      channel: "Email",
    });
    expect(result.recipient).toBe("owner@example.test");
    expect(result.subject).toContain("✓");
    expect(result.text).toContain("Family: Sharma Family");
    expect(result.text).toContain("Billing month: September 2026");
    expect(result.text).toContain("Delivery method: Email");
  });

  it("does nothing when the confirmation setting is off", async () => {
    mocks.findSettings.mockResolvedValue({ parentNotificationAlertEnabled: false });
    expect(
      await sendParentNotificationConfirmation({
        familyName: "Sharma Family",
        month: new Date("2026-09-01"),
        channel: "Manual",
      }),
    ).toMatchObject({ sent: false, skippedBySetting: true });
    expect(mocks.findOwner).not.toHaveBeenCalled();
  });
});

describe("billing-ready admin alert", () => {
  it("is enabled by default and falls back to the active owner email", async () => {
    mocks.findSettings.mockResolvedValue(null);
    const result = await sendBillingReadyAlert(new Date("2026-09-01"), summary);
    expect(result.recipient).toBe("owner@example.test");
    expect(result.subject).toBe("September 2026 bills are ready for review");
    expect(result.text).toContain("4 bills created, 2 updated, and 1 skipped");
  });

  it("does nothing when the owner turns the alert off", async () => {
    mocks.findSettings.mockResolvedValue({ billingAlertEnabled: false });
    expect(await sendBillingReadyAlert(new Date("2026-09-01"), summary)).toMatchObject({
      sent: false,
      skippedBySetting: true,
    });
    expect(mocks.findOwner).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("uses the configured alert address", async () => {
    mocks.findSettings.mockResolvedValue({
      billingAlertEnabled: true,
      billingAlertEmail: "billing@example.test",
      studioName: "Malhaar Dance Company",
      smtpHost: "smtp.example.test",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "mailer@example.test",
      smtpPassword: "encrypted",
      emailFrom: "Malhaar <mailer@example.test>",
      logoUrl: null,
      primaryColor: "#9B1B5E",
    });
    mocks.decryptSecret.mockReturnValue("password");
    mocks.sendEmail.mockResolvedValue({ sent: true });

    const result = await sendBillingReadyAlert(new Date("2026-09-01"), summary);
    expect(result).toMatchObject({ sent: true, recipient: "billing@example.test" });
    expect(mocks.findOwner).not.toHaveBeenCalled();
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "billing@example.test" }));
  });
});
