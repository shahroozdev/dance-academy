function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export type RegistrationReceivedInput = {
  parentGuardianName: string;
  studentFullName: string;
  className: string;
};

export function buildRegistrationReceivedEmail({
  parentGuardianName,
  studentFullName,
  className,
}: RegistrationReceivedInput): { subject: string; text: string } {
  const subject = "We received your registration — Malhaar Dance Company";
  const text = [
    `Hi ${firstName(parentGuardianName)},`,
    "",
    `Thank you for registering ${studentFullName} for ${className} at Malhaar Dance Company!`,
    "We've received your submission and will review it shortly. You'll get another email once enrollment is confirmed.",
    "",
    "If anything on the registration needs to change, just reply to this email.",
    "",
    "Thank you!",
    "Malhaar Dance Company",
  ].join("\n");
  return { subject, text };
}

export type EnrollmentConfirmedInput = {
  parentGuardianName: string;
  studentFullName: string;
  className: string;
};

export function buildEnrollmentConfirmedEmail({
  parentGuardianName,
  studentFullName,
  className,
}: EnrollmentConfirmedInput): { subject: string; text: string } {
  const subject = `${studentFullName} is enrolled — Malhaar Dance Company`;
  const text = [
    `Hi ${firstName(parentGuardianName)},`,
    "",
    `Great news — ${studentFullName} is now enrolled in ${className} at Malhaar Dance Company!`,
    "You'll receive a monthly fee notice once billing is generated each month.",
    "",
    "We're excited to have you dancing with us!",
    "",
    "Thank you,",
    "Malhaar Dance Company",
  ].join("\n");
  return { subject, text };
}
