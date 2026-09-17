export function enrollmentCalendarDate(value: Date | string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return date;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function formatEnrollmentCalendarDate(value: Date | string): string {
  const date = enrollmentCalendarDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { timeZone: "UTC" });
}

export function enrollmentDateInputValue(value: Date | string): string {
  const date = enrollmentCalendarDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
