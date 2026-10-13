// Pure formatting helpers for website content. Calendar dates are stored as UTC midnight, the
// same convention the rest of the app uses for date-only values, so they are always read back
// in UTC and never shift by a day.

export const STUDIO_TIME_ZONE = "America/Chicago";

export const formatEventDate = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export const formatShortDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/** "15:00" → "3:00 PM". */
export function formatEventTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** The value a date input expects ("2026-10-25"). */
export const toDateInput = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : "");

export const parseDateInput = (value: string) => new Date(`${value}T00:00:00.000Z`);

/**
 * A calendar date plus a studio-local "HH:mm" as an ISO date-time carrying the studio's UTC
 * offset on that day (it changes with daylight saving), which is the form Google asks for.
 */
export function eventStartIso(date: Date, time: string) {
  const day = toDateInput(date);
  const offset =
    new Intl.DateTimeFormat("en-US", { timeZone: STUDIO_TIME_ZONE, timeZoneName: "longOffset" })
      .formatToParts(new Date(`${day}T${time}:00Z`))
      .find((part) => part.type === "timeZoneName")
      ?.value.replace("GMT", "") || "+00:00";
  return `${day}T${time}:00${offset}`;
}

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    // Accents split off by the line above are dropped, so "Sandhyā" becomes "sandhya".
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** Splits free text into paragraphs on blank lines. */
export const splitParagraphs = (text: string | null | undefined) =>
  (text ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export const focalPosition = (focalX: number, focalY: number) => `${focalX}% ${focalY}%`;

const VIDEO_FILE_PATTERN = /\.(mp4|webm|mov)(\?.*)?$/i;

export const isVideoFile = (url: string) => VIDEO_FILE_PATTERN.test(url);

/** The embeddable player address for a YouTube or Vimeo link, or null for anything else. */
export function videoEmbedUrl(url: string) {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/i);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}
