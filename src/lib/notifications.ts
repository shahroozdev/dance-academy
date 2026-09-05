import { round2 } from "@/lib/billing";

export type FamilyMessageStudent = { name: string; finalAmountDue: number };

export type FamilyMessageInput = {
  parentGuardianName: string;
  monthLabel: string; // e.g. "September 2026"
  students: FamilyMessageStudent[];
};

// Exported for reuse where an email template's {{parentName}} placeholder needs just the first
// name (e.g. @/actions/registrations) — greeting a parent by their full legal name reads oddly.
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// The itemized part shared by the WhatsApp message and the MONTHLY_FEE_NOTICE/PAYMENT_REMINDER
// email templates' {{feeSummary}} placeholder — one line per student, plus a family total line
// only when there's more than one student (a single-student family's total would just repeat the
// one line above it).
export function buildFeeSummary(students: FamilyMessageStudent[]): string {
  const lines = students.map((s) => `${s.name} – ${formatCurrency(s.finalAmountDue)}`);
  if (students.length > 1) {
    const total = round2(students.reduce((sum, s) => sum + s.finalAmountDue, 0));
    lines.push(`Total family amount due: ${formatCurrency(total)}`);
  }
  return lines.join("\n");
}

// Reproduces the requirements doc's §9 example message exactly (verified in notifications.test.ts).
// This is the WhatsApp / "Copy Message" text specifically — the email sent for the same notice
// goes through the customizable MONTHLY_FEE_NOTICE template instead (see @/actions/email-templates).
export function buildFamilyMessage({ parentGuardianName, monthLabel, students }: FamilyMessageInput): string {
  return [
    `Hi ${firstName(parentGuardianName)},`,
    `${monthLabel} dance fees:`,
    buildFeeSummary(students),
    "",
    "Please send the payment when convenient. Thank you!",
  ].join("\n");
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
