export type CsvColumn<T> = { label: string; value: (row: T) => string | number | boolean | null | undefined };

function escapeCsvValue(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvValue(c.value(row))).join(","));
  return [header, ...lines].join("\r\n");
}

// A UTF-8 BOM prefix so Excel (the realistic destination for this) doesn't mangle non-ASCII
// characters in names/notes.
const UTF8_BOM = "﻿";

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([UTF8_BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// RFC 4180 parser (quoted fields, escaped `""`, CRLF/LF) — the inverse of toCsv above, tolerant of
// whatever a spreadsheet app re-saves the file as.
export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\r") { /* swallowed; \n (if present) ends the row */ }
    else if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

// Maps parsed rows to objects keyed by (trimmed) header, for a CSV whose first row is a header.
export function csvRowsToObjects(rows: string[][]): Record<string, string>[] {
  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((h) => h.trim());
  return body.map((row) => {
    const obj: Record<string, string> = {};
    keys.forEach((key, i) => { obj[key] = (row[i] ?? "").trim(); });
    return obj;
  });
}
