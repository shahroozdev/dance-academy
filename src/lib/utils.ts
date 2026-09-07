export { cn } from "cn"

// Local calendar date (not UTC) — matches what a <input type="date"> max attribute compares
// against, so "today" means the browser's local today, not a UTC-shifted one.
export function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
