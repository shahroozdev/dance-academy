export function formatStudentDuration(
  joinDate: Date | string,
  asOf: Date = new Date(),
): string {
  const joined = new Date(joinDate);
  if (Number.isNaN(joined.getTime()) || Number.isNaN(asOf.getTime())) return "—";

  let totalMonths =
    (asOf.getUTCFullYear() - joined.getUTCFullYear()) * 12 +
    asOf.getUTCMonth() -
    joined.getUTCMonth();
  if (asOf.getUTCDate() < joined.getUTCDate()) totalMonths--;
  totalMonths = Math.max(0, totalMonths);

  if (totalMonths === 0) return "Less than 1 month";

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts = [
    years > 0 ? `${years} ${years === 1 ? "year" : "years"}` : "",
    months > 0 ? `${months} ${months === 1 ? "month" : "months"}` : "",
  ].filter(Boolean);

  return parts.join(", ");
}

export function formatStudentJoinDate(joinDate: Date | string): string {
  const joined = new Date(joinDate);
  if (Number.isNaN(joined.getTime())) return "—";

  return joined.toLocaleDateString("en-US", { timeZone: "UTC" });
}
