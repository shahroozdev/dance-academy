"use client";

import { AlertCircle, CheckCircle2, Download, Upload, XCircle } from "lucide-react";
import { useRef, useState } from "react";

import type { StudentImportResult } from "@/actions/students";
import type { StudentImportRow } from "@/actions/students.schema";
import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { Badge } from "@/components/ui/badge";
import { useMutate } from "@/hooks/useMutate";
import { csvRowsToObjects, downloadCsv, parseCsv, toCsv } from "@/lib/csv";

const TEMPLATE_HEADERS = [
  "Student Name",
  "Family Name",
  "Parent/Guardian Name",
  "Parent Email",
  "Parent Phone",
  "Date of Birth",
  "Gender",
  "Status",
];

const TEMPLATE_EXAMPLE: Record<string, string> = {
  "Student Name": "Nia Patel",
  "Family Name": "Patel Family",
  "Parent/Guardian Name": "Raj Patel",
  "Parent Email": "raj.patel@example.com",
  "Parent Phone": "555-123-4567",
  "Date of Birth": "2015-06-12",
  Gender: "Female",
  Status: "Active",
};

type ParsedRow = { row: number; data: StudentImportRow; error?: string };

function downloadTemplate() {
  const csv = toCsv(
    [TEMPLATE_EXAMPLE],
    TEMPLATE_HEADERS.map((label) => ({ label, value: (r: Record<string, string>) => r[label] })),
  );
  downloadCsv("students-import-template.csv", csv);
}

function toImportRow(obj: Record<string, string>): StudentImportRow {
  const status = (obj["Status"] ?? "").trim().toLowerCase();
  return {
    studentName: obj["Student Name"] ?? "",
    familyName: obj["Family Name"] || undefined,
    parentGuardianName: obj["Parent/Guardian Name"] || undefined,
    parentEmail: obj["Parent Email"] || undefined,
    parentPhone: obj["Parent Phone"] || undefined,
    dob: obj["Date of Birth"] || undefined,
    gender: obj["Gender"] || undefined,
    isActive: status === "inactive" ? false : true,
  };
}

// Client-side pre-check, before the file is ever sent to the server — catches the obvious
// "forgot a column" mistakes so the admin isn't waiting on a round trip to see them.
function validateRow(data: StudentImportRow): string | undefined {
  if (!data.studentName.trim()) return "Student Name is required";
  if (!data.parentPhone?.trim() && !data.parentEmail?.trim()) {
    return "Parent Phone or Parent Email is required (to match or create a family)";
  }
  return undefined;
}

function resultIcon(status: StudentImportResult["status"]) {
  if (status === "created") return <CheckCircle2 className="size-3.5 text-emerald-600" />;
  if (status === "skipped") return <AlertCircle className="size-3.5 text-amber-600" />;
  return <XCircle className="size-3.5 text-destructive" />;
}

export function ImportStudentsModal({ onClose }: { onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [results, setResults] = useState<StudentImportResult[] | null>(null);

  const { mutate: runImport, isLoading, error } = useMutate("importStudents", {
    invalidateKeys: ["getStudents", "getFamilies"],
    onSuccess: setResults,
  });

  const validRows = rows.filter((r) => !r.error);
  const invalidCount = rows.length - validRows.length;

  const handleFile = async (file: File) => {
    setResults(null);
    setParseError(null);
    setFileName(file.name);

    const text = await file.text();
    const parsed = csvRowsToObjects(parseCsv(text));
    if (parsed.length === 0) {
      setRows([]);
      setParseError("No data rows found in this file.");
      return;
    }

    setRows(
      parsed.map((obj, i) => {
        const data = toImportRow(obj);
        return { row: i + 2, data, error: validateRow(data) };
      }),
    );
  };

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} className="max-w-2xl">
      {({ close }) => (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Import Students</h3>
          <p className="text-sm text-muted-foreground">
            Upload a CSV of students to add in bulk. Each row is matched to an existing family by
            Parent Phone or Parent Email; if no family matches, a new one is created from the
            Family Name / Parent Name / Phone in that row.
          </p>

          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="size-4" />
            Download CSV Template
          </Button>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="size-4" />
              {fileName ?? "Choose CSV File"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void handleFile(file);
              }}
            />
          </div>

          {parseError && <p className="text-sm text-destructive">{parseError}</p>}

          {rows.length > 0 && !results && (
            <div className="space-y-2">
              <p className="text-sm">
                {validRows.length} row{validRows.length === 1 ? "" : "s"} ready to import
                {invalidCount > 0 && (
                  <span className="text-destructive"> · {invalidCount} row{invalidCount === 1 ? "" : "s"} skipped (see below)</span>
                )}
              </p>
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <Table resizable={false}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Family</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.row}>
                        <TableCell className="text-muted-foreground">{r.row}</TableCell>
                        <TableCell>{r.data.studentName || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>{r.data.familyName || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          {r.error ? (
                            <span className="text-xs text-destructive">{r.error}</span>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Ready</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-2">
              <p className="text-sm">
                {results.filter((r) => r.status === "created").length} created ·{" "}
                {results.filter((r) => r.status === "skipped").length} skipped (already existed) ·{" "}
                {results.filter((r) => r.status === "error").length} failed
              </p>
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <Table resizable={false}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r) => (
                      <TableRow key={r.row}>
                        <TableCell className="text-muted-foreground">{r.row}</TableCell>
                        <TableCell>{r.studentName || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {resultIcon(r.status)}
                            <span className="text-xs">{r.message ?? r.status}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {Boolean(error) && (
            <p className="text-sm text-destructive">Could not import. Please check the file and try again.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={close}>
              {results ? "Close" : "Cancel"}
            </Button>
            {!results && (
              <Button
                type="button"
                disabled={validRows.length === 0 || isLoading}
                onClick={() => runImport(validRows.map((r) => r.data))}
              >
                {isLoading ? "Importing..." : `Import ${validRows.length || ""} Student${validRows.length === 1 ? "" : "s"}`}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
