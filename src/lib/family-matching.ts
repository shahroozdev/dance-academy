import { normalizePhoneForWhatsApp } from "@/lib/notifications";

export function matchRegistrationFamily<T extends { id: string; phone: string; email: string | null }>(
  families: T[], phone: string, email: string | null,
): T | null {
  const normalizedPhone = normalizePhoneForWhatsApp(phone);
  const normalizedEmail = email?.trim().toLowerCase();
  const matches = families.filter(family =>
    normalizePhoneForWhatsApp(family.phone) === normalizedPhone ||
    (!!normalizedEmail && family.email?.trim().toLowerCase() === normalizedEmail),
  );
  if (matches.length > 1) throw new Error("The phone or email matches more than one family. Correct the family contact details before approving.");
  return matches[0] ?? null;
}
