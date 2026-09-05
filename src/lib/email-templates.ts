// Matches the Prisma EmailTemplateKey enum (prisma/schema.prisma) — kept as a plain union here,
// not imported from the generated client, so this stays a dependency-free lib file like the rest
// of src/lib/*.
export type EmailTemplateKeyValue =
  | "REGISTRATION_RECEIVED"
  | "ENROLLMENT_CONFIRMED"
  | "MONTHLY_FEE_NOTICE"
  | "PAYMENT_REMINDER";

export const EMAIL_TEMPLATE_KEYS: EmailTemplateKeyValue[] = [
  "REGISTRATION_RECEIVED",
  "ENROLLMENT_CONFIRMED",
  "MONTHLY_FEE_NOTICE",
  "PAYMENT_REMINDER",
];

export type EmailTemplateMeta = {
  key: EmailTemplateKeyValue;
  label: string;
  description: string;
  placeholders: string[];
  defaultSubject: string;
  defaultBody: string;
};

// Defaults reproduce the wording the app used before templates were editable — nothing changes
// for a studio that never opens the Email Templates settings tab.
export const EMAIL_TEMPLATES: Record<EmailTemplateKeyValue, EmailTemplateMeta> = {
  REGISTRATION_RECEIVED: {
    key: "REGISTRATION_RECEIVED",
    label: "Registration Received",
    description: "Sent to a parent right after they submit the public registration form.",
    placeholders: ["parentName", "studentName", "className", "studioName"],
    defaultSubject: "We received your registration — {{studioName}}",
    defaultBody: [
      "Hi {{parentName}},",
      "",
      "Thank you for registering {{studentName}} for {{className}} at {{studioName}}!",
      "We've received your submission and will review it shortly. You'll get another email once enrollment is confirmed.",
      "",
      "If anything on the registration needs to change, just reply to this email.",
      "",
      "Thank you!",
      "{{studioName}}",
    ].join("\n"),
  },
  ENROLLMENT_CONFIRMED: {
    key: "ENROLLMENT_CONFIRMED",
    label: "Enrollment Confirmed",
    description: "Sent to a family once the admin approves a registration request.",
    placeholders: ["parentName", "studentName", "className", "studioName"],
    defaultSubject: "{{studentName}} is enrolled — {{studioName}}",
    defaultBody: [
      "Hi {{parentName}},",
      "",
      "Great news — {{studentName}} is now enrolled in {{className}} at {{studioName}}!",
      "You'll receive a monthly fee notice once billing is generated each month.",
      "",
      "We're excited to have you dancing with us!",
      "",
      "Thank you,",
      "{{studioName}}",
    ].join("\n"),
  },
  MONTHLY_FEE_NOTICE: {
    key: "MONTHLY_FEE_NOTICE",
    label: "Monthly Fee Notice",
    description: "Sent when the admin notifies a family about a month's generated bill(s).",
    placeholders: ["parentName", "monthLabel", "feeSummary", "studioName"],
    defaultSubject: "{{monthLabel}} Dance Fees — {{studioName}}",
    defaultBody: [
      "Hi {{parentName}},",
      "",
      "{{monthLabel}} dance fees:",
      "{{feeSummary}}",
      "",
      "Please send the payment when convenient. Thank you!",
    ].join("\n"),
  },
  PAYMENT_REMINDER: {
    key: "PAYMENT_REMINDER",
    label: "Payment Reminder",
    description: "Sent once, automatically, when a bill is still unpaid past its due date (§5.4).",
    placeholders: ["parentName", "monthLabel", "feeSummary", "studioName"],
    defaultSubject: "Payment Reminder — {{monthLabel}} Dance Fees",
    defaultBody: [
      "Hi {{parentName}},",
      "",
      "This is a friendly reminder that {{monthLabel}} dance fees are still outstanding:",
      "{{feeSummary}}",
      "",
      "Please send the payment as soon as possible. Thank you!",
    ].join("\n"),
  },
};

// Replaces every {{key}} token found in `vars`; leaves any other {{...}} token untouched (visibly
// broken rather than silently vanishing, so a typo'd placeholder in a saved template is obvious).
export function renderPlaceholders(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}

export function renderEmailTemplate(
  template: { subject: string; body: string },
  vars: Record<string, string>,
): { subject: string; text: string } {
  return {
    subject: renderPlaceholders(template.subject, vars),
    text: renderPlaceholders(template.body, vars),
  };
}
