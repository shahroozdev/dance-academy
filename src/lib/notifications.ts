import { round2 } from "@/lib/billing";

export type FamilyMessageStudent = { name: string; finalAmountDue: number };

export type FamilyMessageInput = {
  parentGuardianName: string;
  monthLabel: string; // e.g. "September 2026"
  students: FamilyMessageStudent[];
};

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// Reproduces the requirements doc's §9 example message exactly (verified in notifications.test.ts).
// A family with 2+ billed students gets one combined message; a single-student family skips the
// redundant "Total family amount due" line since it would just repeat the one line above it.
export function buildFamilyMessage({ parentGuardianName, monthLabel, students }: FamilyMessageInput): string {
  const lines = students.map((s) => `${s.name} – ${formatCurrency(s.finalAmountDue)}`);
  const total = round2(students.reduce((sum, s) => sum + s.finalAmountDue, 0));

  const parts = [`Hi ${firstName(parentGuardianName)},`, `${monthLabel} dance fees:`, ...lines];
  if (students.length > 1) {
    parts.push(`Total family amount due: ${formatCurrency(total)}`);
  }
  parts.push("", "Please send the payment when convenient. Thank you!");

  return parts.join("\n");
}

// Payment-reminder variant of buildFamilyMessage (§5.4) — same per-student breakdown, framed as a
// past-due nudge rather than the original notice. Sent once per bill by the reminder cron.
export function buildPaymentReminderMessage({ parentGuardianName, monthLabel, students }: FamilyMessageInput): string {
  const lines = students.map((s) => `${s.name} – ${formatCurrency(s.finalAmountDue)}`);
  const total = round2(students.reduce((sum, s) => sum + s.finalAmountDue, 0));

  const parts = [
    `Hi ${firstName(parentGuardianName)},`,
    `This is a friendly reminder that ${monthLabel} dance fees are still outstanding:`,
    ...lines,
  ];
  if (students.length > 1) {
    parts.push(`Total family amount due: ${formatCurrency(total)}`);
  }
  parts.push("", "Please send the payment as soon as possible. Thank you!");

  return parts.join("\n");
}

// Best-effort normalization for a wa.me deep link — assumes a 10-digit number without a country
// code is a US number, since this studio uses Zelle (a US-only payment system).
export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${normalizePhoneForWhatsApp(phone)}?text=${encodeURIComponent(message)}`;
}
