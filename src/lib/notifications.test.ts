import { describe, expect, it } from "vitest";

import {
  buildFamilyMessage,
  buildFeeBreakdown,
  buildFeeSummary,
  buildWhatsAppLink,
  normalizePhoneForWhatsApp,
} from "@/lib/notifications";

const bollywood = { className: "2026 Bollywood 11:30-12:30", rate: 20, discountEligible: true, seasonal: false };
const emilySeptember = {
  name: "Emily Ann Moolayil",
  finalAmountDue: 72.2,
  amountPaid: 0,
  balance: 72.2,
  multiClassDiscount: 4,
  siblingDiscount: 3.8,
  adjustment: 0,
  lines: [
    { className: "2026 Cinematic 1:30-2:30", amount: 40, rate: 20, discountEligible: true, seasonal: false },
    { className: "2026 Western 12:30-1:30", amount: 40, rate: 20, discountEligible: true, seasonal: false },
  ],
};
const evaniyaSeptember = {
  name: "Evaniya Ann Moolayil",
  finalAmountDue: 38,
  amountPaid: 0,
  balance: 38,
  multiClassDiscount: 0,
  siblingDiscount: 2,
  adjustment: 0,
  lines: [{ ...bollywood, amount: 40 }],
};

// Sums every "$x" that ends a class or adjustment line of the breakdown.
function itemizedTotal(text: string): number {
  return Math.round(text.split("\n")
    .filter((line) => line.startsWith("   "))
    .reduce((sum, line) => {
      const match = /: .*?(-?)\$([\d,.]+)(?: \(|$)/.exec(line);
      return match ? sum + (match[1] ? -1 : 1) * Number(match[2].replace(",", "")) : sum;
    }, 0) * 100) / 100;
}

describe("buildFeeBreakdown", () => {
  it("itemizes each student's classes with sessions, class amount and price per class after discounts", () => {
    expect(buildFeeBreakdown([{ monthLabel: "September 2026", students: [emilySeptember, evaniyaSeptember] }])).toBe(
      [
        "September 2026",
        "• Emily Ann Moolayil – $72.20 (includes multiple-class and sibling discounts)",
        "   2026 Cinematic 1:30-2:30: 2 classes – $36.10 ($18.05/class)",
        "   2026 Western 12:30-1:30: 2 classes – $36.10 ($18.05/class)",
        "• Evaniya Ann Moolayil – $38.00 (includes sibling discount)",
        "   2026 Bollywood 11:30-12:30: 2 classes – $38.00 ($19.00/class)",
        "Still due: $110.20",
        "",
        "Total due: $110.20",
      ].join("\n"),
    );
  });

  it("class lines always add up to the student's amount, and drop the per-class price when it is not whole cents", () => {
    const uneven = {
      ...evaniyaSeptember,
      name: "Uneven",
      multiClassDiscount: 3.01,
      siblingDiscount: 2.85,
      finalAmountDue: 54.14,
      balance: 54.14,
      lines: [{ ...bollywood, amount: 20 }, { ...bollywood, className: "Western", amount: 20 }, { ...bollywood, className: "Cinematic", amount: 20 }],
    };
    const text = buildFeeBreakdown([{ monthLabel: "October 2026", students: [uneven] }]);
    expect(itemizedTotal(text)).toBe(54.14);
    expect(text).toContain("   2026 Bollywood 11:30-12:30: 1 class – $18.05 ($18.05/class)");
    expect(text).toContain("   Cinematic: 1 class – $18.04 ($18.04/class)");
  });

  it("adds earlier months still owed and totals what is still due across them", () => {
    const october = { ...evaniyaSeptember, finalAmountDue: 57, balance: 17, amountPaid: 40, siblingDiscount: 3, lines: [{ ...bollywood, amount: 60 }] };
    const text = buildFeeBreakdown([
      { monthLabel: "September 2026", students: [evaniyaSeptember] },
      { monthLabel: "October 2026", students: [october] },
    ]);
    expect(text).toContain("• Evaniya Ann Moolayil – $57.00 (includes sibling discount), paid $40.00, $17.00 still due");
    expect(text).toContain("   2026 Bollywood 11:30-12:30: 3 classes – $57.00 ($19.00/class)");
    expect(text.endsWith("Total due for all months above: $55.00")).toBe(true);
  });

  it("shows the actual credit for an overpaid bill, and 'paid in full' only when the balance is zero", () => {
    const overpaid = { ...evaniyaSeptember, amountPaid: 50, balance: -12 };
    const text = buildFeeBreakdown([{ monthLabel: "September 2026", students: [overpaid] }]);
    expect(text).toContain("• Evaniya Ann Moolayil – $38.00 (includes sibling discount), paid $50.00, credit $12.00");
    expect(text).toContain("Credit: $12.00");
    const settled = buildFeeBreakdown([{ monthLabel: "September 2026", students: [{ ...evaniyaSeptember, amountPaid: 38, balance: 0 }] }]);
    expect(settled).toContain("paid $38.00, paid in full");
  });

  it("nets a refund into the amount paid", () => {
    const refunded = { ...evaniyaSeptember, amountPaid: 28, balance: 10 };
    expect(buildFeeBreakdown([{ monthLabel: "September 2026", students: [refunded] }])).toContain("paid $28.00, $10.00 still due");
  });

  it("shows seasonal fees as one-time, rehearsal-inflated lines as an amount, and adjustments, adding up exactly", () => {
    const text = buildFeeBreakdown([{
      monthLabel: "August 2026",
      students: [{
        name: "Avisha Talele",
        finalAmountDue: 210,
        amountPaid: 0,
        balance: 210,
        multiClassDiscount: 0,
        siblingDiscount: 0,
        adjustment: -20,
        lines: [
          { className: "Onam Dance 2026 SJ", amount: 160, rate: null, discountEligible: false, seasonal: true },
          { className: "Bharatanatyam Intermediate WoodDale", amount: 70, rate: 20, discountEligible: true, seasonal: false },
        ],
      }],
    }]);
    expect(text).toContain("   Onam Dance 2026 SJ: one-time fee $160.00");
    expect(text).toContain("   Bharatanatyam Intermediate WoodDale: $70.00");
    expect(text).toContain("   Adjustment: -$20.00");
    expect(itemizedTotal(text)).toBe(210);
  });
});

describe("buildFamilyMessage", () => {
  it("greets by first name, names every month, and closes with the studio's payment instructions", () => {
    const message = buildFamilyMessage({
      parentGuardianName: "Mary Anne O'Brien",
      months: [
        { monthLabel: "September 2026", students: [evaniyaSeptember] },
        { monthLabel: "October 2026", students: [{ ...evaniyaSeptember, siblingDiscount: 3, finalAmountDue: 57, balance: 57, lines: [{ ...bollywood, amount: 60 }] }] },
      ],
    });
    expect(message.startsWith("Hi Mary,\n\nHere is the dance fee breakdown for September 2026 and October 2026:\n\nSeptember 2026\n")).toBe(true);
    expect(message.endsWith(
      "Please let me know if you have any questions. When you make the payment, kindly reply to this message. If you have already paid, please ignore this message.\n\nThank you",
    )).toBe(true);
  });
});

describe("buildFeeSummary", () => {
  it("lists each student's amount plus a family total when there's more than one", () => {
    expect(
      buildFeeSummary([
        { name: "Nia", finalAmountDue: 144.4 },
        { name: "Leia", finalAmountDue: 76.0 },
      ]),
    ).toBe("Nia – $144.40\nLeia – $76.00\nTotal family amount due: $220.40");
  });

  it("omits the redundant total line for a single-student family", () => {
    expect(buildFeeSummary([{ name: "Meera", finalAmountDue: 80 }])).toBe("Meera – $80.00");
  });
});

describe("normalizePhoneForWhatsApp", () => {
  it("prepends US country code to a bare 10-digit number", () => {
    expect(normalizePhoneForWhatsApp("(555) 123-4567")).toBe("15551234567");
  });

  it("leaves an already-country-coded number untouched aside from stripping formatting", () => {
    expect(normalizePhoneForWhatsApp("+1 555-123-4567")).toBe("15551234567");
  });

  it("prepends India's country code for an Indian number entered via the international input", () => {
    expect(normalizePhoneForWhatsApp("+91 98765 43210")).toBe("919876543210");
  });

  it("does not mistake a 10-digit number for a bare US number once it declares a country via '+'", () => {
    // Singapore's E.164 form is 10 digits once the "+" is stripped — must not get a US "1" prepended.
    expect(normalizePhoneForWhatsApp("+65 8123 4567")).toBe("6581234567");
  });
});

describe("buildWhatsAppLink", () => {
  it("builds a wa.me link with the phone digits and URL-encoded message", () => {
    const link = buildWhatsAppLink("555-123-4567", "Hi Anu,\nfees due");
    expect(link).toBe("https://wa.me/15551234567?text=Hi%20Anu%2C%0Afees%20due");
  });
});
