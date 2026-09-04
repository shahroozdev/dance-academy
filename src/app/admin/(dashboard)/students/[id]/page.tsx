"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { toggleStudentActive } from "@/actions/students";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Modal } from "@/components/common/modal";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={student.fullName}
        subtitle={`${student.family.familyName} family`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/students/${id}/edit`}>Edit</Link>
            </Button>
            <Modal
              trigger={
                <Button variant={student.isActive ? "destructive" : "default"}>
                  {student.isActive ? "Deactivate" : "Activate"}
                </Button>
              }
              className="max-w-sm"
            >
              {({ close }) => (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">
                      {student.isActive ? "Deactivate Student?" : "Activate Student?"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {student.isActive
                        ? "This student will be excluded from future billing generation."
                        : "This student will be included in future billing generation."}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={close}>Cancel</Button>
                    <Button
                      variant={student.isActive ? "destructive" : "default"}
                      onClick={async () => {
                        await toggleActive(id, !student.isActive);
                        close();
                      }}
                    >
                      {student.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              )}
            </Modal>
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
            <p className="font-medium">{new Date(student.joinDate).toLocaleDateString()}</p>
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
                    Since {new Date(enrollment.startDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
          </div>
        )}
      </Card>

      {student.monthlyBillings.length > 0 && (
        <Card
          header={<span className="text-sm font-medium">Recent Billing History</span>}
          headerClassName="border-b"
        >
          <div className="divide-y">
            {student.monthlyBillings.map((billing) => (
              <div
                key={billing.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/admin/billing/${billing.id}`)}
              >
                <div>
                  <p className="font-medium">
                    {new Date(billing.month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-medium">${Number(billing.finalAmountDue).toFixed(2)}</p>
                  <Badge
                    variant={
                      billing.status === "PAID"
                        ? "default"
                        : billing.status === "PARTIAL"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {billing.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
