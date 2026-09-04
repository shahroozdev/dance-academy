import { describe, expect, it } from "vitest";

import { buildFamilyMessage, buildWhatsAppLink, normalizePhoneForWhatsApp } from "@/lib/notifications";

describe("buildFamilyMessage", () => {
  it("reproduces the requirements doc's §9 worked example exactly (Nia/Leia siblings)", () => {
    const message = buildFamilyMessage({
      parentGuardianName: "Anu Sharma",
      monthLabel: "September",
      students: [
        { name: "Nia", finalAmountDue: 144.4 },
        { name: "Leia", finalAmountDue: 76.0 },
      ],
    });

    expect(message).toBe(
      [
        "Hi Anu,",
        "September dance fees:",
        "Nia – $144.40",
        "Leia – $76.00",
        "Total family amount due: $220.40",
        "",
        "Please send the payment when convenient. Thank you!",
      ].join("\n"),
    );
  });

  it("omits the redundant family-total line for a single-student family", () => {
    const message = buildFamilyMessage({
      parentGuardianName: "Priya Nair",
      monthLabel: "September",
      students: [{ name: "Meera", finalAmountDue: 80 }],
    });

    expect(message).toBe(
      ["Hi Priya,", "September dance fees:", "Meera – $80.00", "", "Please send the payment when convenient. Thank you!"].join(
        "\n",
      ),
    );
  });

  it("greets by first name only, even for a multi-word parent name", () => {
    const message = buildFamilyMessage({
      parentGuardianName: "Mary Anne O'Brien",
      monthLabel: "October",
      students: [{ name: "Kid", finalAmountDue: 50 }],
    });
    expect(message.startsWith("Hi Mary,")).toBe(true);
  });
});

describe("normalizePhoneForWhatsApp", () => {
  it("prepends US country code to a bare 10-digit number", () => {
    expect(normalizePhoneForWhatsApp("(555) 123-4567")).toBe("15551234567");
  });

  it("leaves an already-country-coded number untouched aside from stripping formatting", () => {
    expect(normalizePhoneForWhatsApp("+1 555-123-4567")).toBe("15551234567");
  });
});

describe("buildWhatsAppLink", () => {
  it("builds a wa.me link with the phone digits and URL-encoded message", () => {
    const link = buildWhatsAppLink("555-123-4567", "Hi Anu,\nfees due");
    expect(link).toBe("https://wa.me/15551234567?text=Hi%20Anu%2C%0Afees%20due");
  });
});
