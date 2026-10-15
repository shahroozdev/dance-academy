"use client";

import { useParams } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { PermanentDeleteModal } from "@/components/common/permanent-delete-modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/hooks/useRouter";
import { formatEnrollmentCalendarDate } from "@/lib/enrollment-date";
import { formatStudentDuration, formatStudentJoinDate } from "@/lib/student-duration";
import { todayIsoDate } from "@/lib/utils";

const lastClassDateSchema = z.object({ lastClassDate: z.iso.date("Enter a valid last class date") });

const BILLING_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  PAID: "default",
  PARTIAL: "secondary",
};

function formatAge(dob: Date | string | null): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age} years`;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: student, isLoading } = useQuery("getStudentById", [id]);
  const { mutate: toggleActive } = useMutate("toggleStudentActive", {
    invalidateKeys: ["getStudents", "getStudentById"],
  });
  const {
    mutate: removeStudent,
    isLoading: isDeleting,
    error: deleteError,
  } = useMutate("deleteStudent", {
    invalidateKeys: ["getStudents", "getFamilies", "getStudentById", "getFamilyById"],
    onSuccess: () => router.push("/admin/students"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-muted-foreground">Student not found.</p>
        <Button asChild variant="outline">
          <Link href="/admin/students">Back to Students</Link>
        </Button>
      </div>
    );
  }

  const hasActiveEnrollments = student.enrollments.some((enrollment) => enrollment.status === "ACTIVE");
  const needsDeactivationCompletion = !student.isActive && hasActiveEnrollments;
  const isEndingEnrollments = student.isActive || needsDeactivationCompletion;
  const actionKey = {
    "active-false": "deactivate",
    "active-true": "deactivate",
    "inactive-false": "activate",
    "inactive-true": "complete",
  }[`${student.isActive ? "active" : "inactive"}-${hasActiveEnrollments}`] as "activate" | "complete" | "deactivate";
  const actionLabels = {
    activate: { button: "Activate", title: "Activate Student?" },
    complete: { button: "Set Last Class Date", title: "Complete Student Deactivation" },
    deactivate: { button: "Deactivate", title: "Deactivate Student?" },
  }[actionKey];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={student.fullName}
        subtitle={`${student.family.familyName} family`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/students/${id}/edit`}>Edit</Link>
            </Button>
            <Modal
              trigger={
                <Button variant={isEndingEnrollments ? "destructive" : "default"}>
                  {actionLabels.button}
                </Button>
              }
              className="max-w-sm"
              title={
                <div>
                  {actionLabels.title}
                  <p className="text-sm font-normal text-muted-foreground">
                    {isEndingEnrollments
                      ? "This student will be excluded from future billing generation."
                      : "This student will be included in future billing generation."}
                  </p>
                </div>
              }
            >
              {({ close }) => isEndingEnrollments ? (
                <FORM
                  schema={lastClassDateSchema}
                  defaultValues={{ lastClassDate: todayIsoDate() }}
                  onSubmit={async ({ lastClassDate }) => {
                    await toggleActive(id, false, lastClassDate);
                    close();
                  }}
                >
                  <div className="space-y-4">
                    <FormFeilds name="lastClassDate" label="Last Class Date" type="date" required />
                    <p className="text-sm text-muted-foreground">All active enrollments will end on this date. The final month will charge only scheduled classes through this date.</p>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                      <Button type="submit" variant="destructive">{actionLabels.button}</Button>
                    </div>
                  </div>
                </FORM>
              ) : (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={close}>Cancel</Button>
                  <Button onClick={async () => { await toggleActive(id, true); close(); }}>Activate</Button>
                </div>
              )}
            </Modal>
            <PermanentDeleteModal
              entityName={student.fullName}
              entityLabel="student"
              impact="This removes the student and their registration, enrollment, billing, and payment history. If this is the family's only student, the empty family record is also removed."
              isLoading={isDeleting}
              error={deleteError}
              onConfirm={(confirmationName) => removeStudent(id, confirmationName)}
            />
          </div>
        }
      />

      <Card
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Profile</span>
            <Badge variant={student.isActive ? "default" : "secondary"}>
              {student.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        }
        headerClassName="border-b"
      >
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Family</p>
            <p className="font-medium">
              <Link href={`/admin/families/${student.familyId}`} className="hover:underline">
                {student.family.familyName}
              </Link>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date of Birth</p>
            <p className="font-medium">
              {student.dob ? new Date(student.dob).toLocaleDateString() : "—"}
              {student.dob && <span className="text-muted-foreground ml-2">({formatAge(student.dob)})</span>}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gender</p>
            <p className="font-medium">{student.gender?.replace("_", " ") ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Join Date</p>
            <p className="font-medium">{formatStudentJoinDate(student.joinDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Time with Malhaar</p>
            <p className="font-medium">{formatStudentDuration(student.joinDate)}</p>
          </div>
          {student.medicalNotes && (
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">Medical/Allergy Notes</p>
              <p className="font-medium">{student.medicalNotes}</p>
            </div>
          )}
          {student.generalNotes && (
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">General Notes</p>
              <p className="font-medium">{student.generalNotes}</p>
            </div>
          )}
          {(student.emergencyContactName || student.emergencyPhone) && (
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">Emergency Contact</p>
              <p className="font-medium">
                {student.emergencyContactName}
                {student.emergencyContactRelationship && ` (${student.emergencyContactRelationship})`}
                {student.emergencyPhone && ` — ${student.emergencyPhone}`}
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Active Enrollments ({student.enrollments.filter((e) => e.status === "ACTIVE").length})
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/enrollments?studentId=${id}`}>Manage</Link>
            </Button>
          </div>
        }
        headerClassName="border-b"
      >
        {student.enrollments.filter((e) => e.status === "ACTIVE").length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">No active enrollments.</p>
          </div>
        ) : (
          <div className="divide-y">
            {student.enrollments
              .filter((e) => e.status === "ACTIVE")
              .map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/admin/classes/${enrollment.classId}`)}
                >
                  <div>
                    <p className="font-medium">{enrollment.class.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {enrollment.class.dayOfWeek?.replace("_", " ")}
                      {enrollment.class.startTime && ` at ${enrollment.class.startTime}`}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Since {formatEnrollmentCalendarDate(enrollment.startDate)}
                  </p>
                </div>
              ))}
          </div>
        )}
      </Card>

      {student.monthlyBillings.length > 0 && (
        <Card
          header={
            <div>
              <span className="text-sm font-medium">Monthly Billing Ledger</span>
              <p className="text-sm font-normal text-muted-foreground">Each row is a separate month. Open a row to review its classes and payments.</p>
            </div>
          }
          headerClassName="border-b"
          contentClassName="p-0"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {student.monthlyBillings.map((billing) => (
                <TableRow
                  key={billing.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/billing/${billing.id}`)}
                >
                  <TableCell className="font-medium">
                    {new Date(billing.month).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
                  </TableCell>
                  <TableCell>${billing.finalAmountDue.toFixed(2)}</TableCell>
                  <TableCell>${billing.amountPaid.toFixed(2)}</TableCell>
                  <TableCell className="font-medium">${billing.balance.toFixed(2)}</TableCell>
                  <TableCell><Badge variant={BILLING_STATUS_VARIANT[billing.status] ?? "destructive"}>{billing.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
