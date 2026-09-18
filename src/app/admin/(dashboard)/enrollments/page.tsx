"use client";

import { CalendarClock, ExternalLink, ListChecks, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { enrollmentStartDateUpdateSchema } from "@/actions/enrollments.schema";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import TooltipWrapper from "@/components/common/TooltipWrapper";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { enrollmentDateInputValue, formatEnrollmentCalendarDate } from "@/lib/enrollment-date";
import { todayIsoDate } from "@/lib/utils";

import { EnrollmentBillingPauseModal } from "./enrollment-billing-pause-modal";

export default function EnrollmentsPage() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId") ?? undefined;
  const classId = searchParams.get("classId") ?? undefined;
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading, refetch } = useQuery("getEnrollments", [{ studentId, classId, page, pageSize }]);
  const { mutate: endEnroll } = useMutate("endEnrollment", {
    invalidateKeys: ["getEnrollments", "getStudents", "getClasses"],
    onSuccess: () => refetch(),
  });
  const { mutate: reactivateEnroll, error: reactivateError } = useMutate("reactivateEnrollment", {
    invalidateKeys: ["getEnrollments", "getStudents", "getClasses"],
    onSuccess: () => refetch(),
  });
  const { mutate: removeEnrollment, isLoading: isRemoving, error: removeError } = useMutate("deleteEnrollment", {
    invalidateKeys: ["getEnrollments", "getStudents", "getClasses", "getMonthlyBillings"],
    onSuccess: () => refetch(),
  });

  // Best-effort dedupe check (limited to the current page) so an already-superseded ENDED row
  // doesn't offer a "Re-enroll" that the backend's active-duplicate guard would just reject.
  const activeStudentClassPairs = useMemo(() => {
    const pairs = new Set<string>();
    data?.data.forEach((e) => {
      if (e.status === "ACTIVE") pairs.add(`${e.studentId}|${e.classId}`);
    });
    return pairs;
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Enrollments"
        subtitle="Manage student class enrollments."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <TooltipWrapper label="Open registration form in new tab">
              <Button variant="outline" asChild>
                <Link href="/register" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                  Enrollment Form
                </Link>
              </Button>
            </TooltipWrapper>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="size-4" />
              Add Enrollment
            </Button>
          </div>
        }
      />
      <Card
        header={
          <div className="flex items-center gap-2">
            <ListChecks className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">All Enrollments</span>
          </div>
        }
        headerClassName="border-b"
      >
        {isLoading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {!isLoading && !data?.data.length && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ListChecks className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No enrollments found.</p>
          </div>
        )}
        {!isLoading && data && data.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/students/${enrollment.studentId}`} className="hover:underline">
                      {enrollment.student.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/classes/${enrollment.classId}`} className="hover:underline">
                      {enrollment.class.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {enrollment.class.dayOfWeek?.replace("_", " ")}
                    {enrollment.class.startTime && ` at ${enrollment.class.startTime}`}
                  </TableCell>
                  <TableCell>{formatEnrollmentCalendarDate(enrollment.startDate)}</TableCell>
                  <TableCell>
                    <Badge variant={enrollment.status === "ACTIVE" ? "default" : "secondary"}>
                      {enrollment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                    <EnrollmentBillingPauseModal
                      enrollmentId={enrollment.id}
                      studentName={enrollment.student.fullName}
                      pauses={enrollment.billingPauses}
                    />
                    <EditEnrollmentStartDate
                      id={enrollment.id}
                      studentName={enrollment.student.fullName}
                      className={enrollment.class.name}
                      startDate={enrollment.startDate}
                    />
                    <Modal
                      trigger={<Button variant="destructive" size="sm">Remove</Button>}
                      className="max-w-sm"
                      title={
                        <div>
                          Remove Accidental Enrollment?
                          <p className="text-sm font-normal text-muted-foreground">
                            Permanently removes {enrollment.student.fullName} from {enrollment.class.name} and recalculates connected unpaid bills. Use End for a real enrollment that has finished.
                          </p>
                        </div>
                      }
                    >
                      {({ close }) => (
                        <div className="space-y-3">
                          {Boolean(removeError) && <p className="text-sm text-destructive">{removeError instanceof Error ? removeError.message : "Could not remove enrollment."}</p>}
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={close}>Cancel</Button>
                            <Button variant="destructive" disabled={isRemoving} onClick={async () => {
                              try { await removeEnrollment(enrollment.id); close(); } catch { /* Error shown above. */ }
                            }}>
                              {isRemoving ? "Removing..." : "Remove Permanently"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </Modal>
                    {enrollment.status === "ACTIVE" && (
                      <Modal
                        trigger={
                          <TooltipWrapper label="End this enrollment">
                            <Button variant="destructive" size="sm">End</Button>
                          </TooltipWrapper>
                        }
                        className="max-w-sm"
                        title={
                          <div>
                            End Enrollment?
                            <p className="text-sm font-normal text-muted-foreground">
                              This will end {enrollment.student.fullName}&apos;s enrollment in {enrollment.class.name}.
                            </p>
                          </div>
                        }
                      >
                        {({ close }) => (
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={close}>Cancel</Button>
                            <Button
                              variant="destructive"
                              onClick={async () => {
                                await endEnroll(enrollment.id, todayIsoDate());
                                close();
                              }}
                            >
                              End Enrollment
                            </Button>
                          </div>
                        )}
                      </Modal>
                    )}
                    {enrollment.status !== "ACTIVE" && activeStudentClassPairs.has(`${enrollment.studentId}|${enrollment.classId}`) && (
                      <TooltipWrapper label={`${enrollment.student.fullName} already has an active enrollment in ${enrollment.class.name}`}>
                        <Button variant="outline" size="sm" disabled>
                          Re-enroll
                        </Button>
                      </TooltipWrapper>
                    )}
                    {enrollment.status !== "ACTIVE" && !activeStudentClassPairs.has(`${enrollment.studentId}|${enrollment.classId}`) && (
                      <Modal
                        trigger={
                          <TooltipWrapper label={`Re-enroll ${enrollment.student.fullName} in ${enrollment.class.name}`}>
                            <Button variant="outline" size="sm">Re-enroll</Button>
                          </TooltipWrapper>
                        }
                        className="max-w-sm"
                        title={
                          <div>
                            Re-enroll?
                            <p className="text-sm font-normal text-muted-foreground">
                              This will reactivate {enrollment.student.fullName}&apos;s enrollment in {enrollment.class.name}, starting today.
                            </p>
                          </div>
                        }
                      >
                        {({ close }) => (
                          <div className="space-y-3">
                            {Boolean(reactivateError) && (
                              <p className="text-sm text-destructive">
                                {reactivateError instanceof Error ? reactivateError.message : "Could not re-enroll. Please try again."}
                              </p>
                            )}
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={close}>Cancel</Button>
                              <Button
                                onClick={async () => {
                                  try {
                                    await reactivateEnroll(enrollment.id, todayIsoDate());
                                    close();
                                  } catch {
                                    // Surfaced via the error message above — nothing further to do here.
                                  }
                                }}
                              >
                                Re-enroll
                              </Button>
                            </div>
                          </div>
                        )}
                      </Modal>
                    )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            pages={data.pages}
            itemLabel="enrollments"
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        )}
      </Card>

      <EnrollmentsCreateModal open={showCreate} onOpenChange={setShowCreate} onCreated={() => refetch()} />
    </div>
  );
}

function EditEnrollmentStartDate({
  id,
  studentName,
  className,
  startDate,
}: {
  id: string;
  studentName: string;
  className: string;
  startDate: Date;
}) {
  const { mutate, isLoading, error } = useMutate("updateEnrollmentStartDate", {
    invalidateKeys: ["getEnrollments", "getStudents", "getStudentById", "getMonthlyBillings"],
  });

  return (
    <Modal
      trigger={
        <TooltipWrapper label="Correct the enrollment start date">
          <Button variant="outline" size="sm">
            <CalendarClock className="size-4" />
            Edit Start Date
          </Button>
        </TooltipWrapper>
      }
      className="max-w-md"
      title="Edit Enrollment Start Date"
    >
      {({ close }) => (
        <FORM
          schema={enrollmentStartDateUpdateSchema}
          defaultValues={{ startDate: enrollmentDateInputValue(startDate) }}
          onSubmit={async (data) => {
            try {
              await mutate(id, data);
              close();
            } catch {
              // The mutation error is displayed below.
            }
          }}
        >
          {(form) => (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Correct when {studentName} actually started {className}. This date determines which class sessions are included in mid-month billing.
              </p>
              <FormFeilds name="startDate" label="First Billable Date" type="date" max={todayIsoDate()} required />
              <p className="text-sm text-muted-foreground">
                Sessions before this date are excluded. A class held on this date or later is included.
              </p>
              <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                After saving, open the student&apos;s affected monthly bill and select <strong>Recalculate</strong>. Bills that already have payments are protected and must be corrected with an adjustment instead.
              </p>
              {Boolean(error) && <p role="alert" className="text-sm text-destructive">{error instanceof Error ? error.message : "Could not update the enrollment start date."}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                <Button type="submit" disabled={isLoading || !form.formState.isDirty || !form.formState.isValid}>
                  {isLoading ? "Saving..." : "Save Start Date"}
                </Button>
              </div>
            </div>
          )}
        </FORM>
      )}
    </Modal>
  );
}

function EnrollmentsCreateModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");
  const [startDate, setStartDate] = useState(todayIsoDate());

  const { data: studentsData } = useQuery("getStudents", [{ pageSize: 100 }]);
  const { data: classesData } = useQuery("getClasses", [{ pageSize: 100 }]);

  const { mutate: createEnroll, isLoading, error } = useMutate("createEnrollment", {
    invalidateKeys: ["getEnrollments", "getStudents", "getClasses"],
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
      setStudentId("");
      setClassId("");
      setStartDate(todayIsoDate());
    },
  });

  const studentOptions = studentsData?.data.map((s) => ({ label: `${s.fullName} (${s.familyName})`, value: s.id })) ?? [];
  const classOptions = classesData?.data.map((c) => ({ label: `${c.name} — ${c.programName}`, value: c.id })) ?? [];

  const selectedClass = classesData?.data.find((c) => c.id === classId);
  const isAtCapacity = selectedClass?.capacity != null && selectedClass.enrollmentCount >= selectedClass.capacity;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-md"
      title="Add Enrollment"
    >
      {() => (
      <div className="space-y-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Student</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select student...</option>
              {studentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Class</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select class...</option>
              {classOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {isAtCapacity && (
              <p className="mt-1 text-sm text-destructive">
                {selectedClass!.name} is at capacity ({selectedClass!.enrollmentCount}/{selectedClass!.capacity}).
                You can still add this enrollment if the studio wants to go over.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="enrollment-start-date" className="text-sm font-medium">First Billable Date</label>
            <Input
              id="enrollment-start-date"
              type="date"
              value={startDate}
              max={todayIsoDate()}
              onChange={setStartDate}
            />
            <p className="mt-1 text-xs text-muted-foreground">Sessions before this date are excluded. A class held on this date or later is included.</p>
          </div>
        </div>
        {Boolean(error) && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Could not save. Please try again."}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!studentId || !classId || !startDate || isLoading}
            onClick={async () => {
              try {
                await createEnroll({ studentId, classId, startDate });
              } catch {
                // Surfaced via the error message above — nothing further to do here.
              }
            }}
          >
            {isLoading ? "Creating..." : "Create Enrollment"}
          </Button>
        </div>
      </div>
      )}
    </Modal>
  );
}
