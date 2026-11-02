import { discountedLineAmounts, round2 } from "@/lib/billing";
import type { FeeNoticeMonth, FeeNoticeStudentBill } from "@/types/billing";

export type FamilyMessageStudent = { name: string; finalAmountDue: number };

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

const DISCOUNT_NOTE: Record<string, string> = {
  "multi+sibling": " (includes multiple-class and sibling discounts)",
  "multi+": " (includes multiple-class discount)",
  "+sibling": " (includes sibling discount)",
  "+": "",
};

function discountNote(bill: FeeNoticeStudentBill): string {
  return DISCOUNT_NOTE[`${bill.multiClassDiscount > 0 ? "multi" : ""}+${bill.siblingDiscount > 0 ? "sibling" : ""}`];
}

function paymentNote(bill: FeeNoticeStudentBill): string {
  if (bill.amountPaid === 0) return "";
  const paid = `, paid ${formatCurrency(bill.amountPaid)}`;
  if (bill.balance > 0) return `${paid}, ${formatCurrency(bill.balance)} still due`;
  if (bill.balance < 0) return `${paid}, credit ${formatCurrency(-bill.balance)}`;
  return `${paid}, paid in full`;
}

// Every class line shows its exact share after discounts, so the lines plus any adjustment add up
// to the student's amount. For a whole number of sessions at the month's rate the session count is
// shown too, with the price per class only when it divides into whole cents.
function classLine(line: FeeNoticeStudentBill["lines"][number], share: number): string {
  if (line.seasonal) return `   ${line.className}: one-time fee ${formatCurrency(share)}`;
  const sessions = line.rate ? line.amount / line.rate : 0;
  if (sessions < 1 || Math.abs(sessions - Math.round(sessions)) >= 0.001) return `   ${line.className}: ${formatCurrency(share)}`;
  const count = Math.round(sessions);
  const perClass = round2(share / count);
  const priceNote = round2(perClass * count) === share ? ` (${formatCurrency(perClass)}/class)` : "";
  return `   ${line.className}: ${count} ${count === 1 ? "class" : "classes"} – ${formatCurrency(share)}${priceNote}`;
}

function studentLines(bill: FeeNoticeStudentBill): string[] {
  const discounted = discountedLineAmounts(bill, bill.lines);
  return [
    `• ${bill.name} – ${formatCurrency(bill.finalAmountDue)}${discountNote(bill)}${paymentNote(bill)}`,
    ...bill.lines.map((line, index) => classLine(line, discounted[index])),
    ...(bill.adjustment !== 0 ? [`   Adjustment: ${bill.adjustment < 0 ? "-" : ""}${formatCurrency(Math.abs(bill.adjustment))}`] : []),
  ];
}

// The itemized notice: one section per month (the notice month plus any earlier month still
// owed), each student's classes with sessions and the per-class rate after discounts, then the
// amount still due. Earlier credits reduce the total due.
export function buildFeeBreakdown(months: FeeNoticeMonth[]): string {
  const sections = months.map(({ monthLabel, students }) => {
    const due = round2(students.reduce((sum, bill) => sum + bill.balance, 0));
    return [monthLabel, ...students.flatMap(studentLines), `${due < 0 ? "Credit" : "Still due"}: ${formatCurrency(Math.abs(due))}`].join("\n");
  });
  const totalDue = round2(months.flatMap((month) => month.students).reduce((sum, bill) => sum + bill.balance, 0));
  const scope = months.length > 1 ? " for all months above" : "";
  const total = totalDue < 0 ? `Credit${scope}: ${formatCurrency(-totalDue)}` : `Total due${scope}: ${formatCurrency(totalDue)}`;
  return [...sections, total].join("\n\n");
}

export function joinMonthLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

export const FEE_NOTICE_CLOSING =
  "Please let me know if you have any questions. When you make the payment, kindly reply to this message. If you have already paid, please ignore this message.";

// The WhatsApp / "Copy Message" text. The email for the same notice goes through the customizable
// MONTHLY_FEE_NOTICE template instead (see @/actions/email-templates), with the same breakdown.
export function buildFamilyMessage({ parentGuardianName, months }: { parentGuardianName: string; months: FeeNoticeMonth[] }): string {
  return [
    `Hi ${firstName(parentGuardianName)},`,
    "",
    `Here is the dance fee breakdown for ${joinMonthLabels(months.map((month) => month.monthLabel))}:`,
    "",
    buildFeeBreakdown(months),
    "",
    FEE_NOTICE_CLOSING,
    "",
    "Thank you",
  ].join("\n");
}

// Normalization for a wa.me deep link. Phone numbers entered through the international phone
// input (@/components/common/phone-input) always carry an explicit "+<country code>" and are
// trusted as-is here — just strip the formatting. The 10-digit-implies-US fallback only exists
// for phone numbers stored before that input existed (a bare local number with no country code);
// it must NOT trigger for a number that already declared its country via a leading "+", since
// plenty of countries' full E.164 numbers are also 10 digits once the "+" is stripped (e.g.
// Singapore's +65 XXXX XXXX) and would otherwise get a bogus US "1" prepended.
export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!phone.trim().startsWith("+") && digits.length === 10) return `1${digits}`;
  return digits;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${normalizePhoneForWhatsApp(phone)}?text=${encodeURIComponent(message)}`;
}
