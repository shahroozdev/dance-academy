"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { getFamilyById, toggleFamilyActive } from "@/actions/families";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Modal } from "@/components/common/modal";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

export default function FamilyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: family, isLoading } = useQuery("getFamilyById", [id]);
  const { mutate: toggleActive } = useMutate("toggleFamilyActive", {
    invalidateKeys: ["getFamilies", "getFamilyById"],
  });

  const [confirmToggle, setConfirmToggle] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-muted-foreground">Family not found.</p>
        <Button asChild variant="outline">
          <Link href="/admin/families">Back to Families</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={family.familyName}
        subtitle={`Parent/Guardian: ${family.parentGuardianName}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/families/${id}/edit`}>Edit</Link>
            </Button>
            <Modal
              trigger={
                <Button variant={family.isActive ? "destructive" : "default"}>
                  {family.isActive ? "Deactivate" : "Activate"}
                </Button>
              }
              className="max-w-sm"
            >
              {({ close }) => (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">
                      {family.isActive ? "Deactivate Family?" : "Activate Family?"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {family.isActive
                        ? "This family will be hidden from active billing and lists."
                        : "This family will reappear in active lists and billing."}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={close}>Cancel</Button>
                    <Button
                      variant={family.isActive ? "destructive" : "default"}
                      onClick={async () => {
                        await toggleActive(id, !family.isActive);
                        close();
                      }}
                    >
                      {family.isActive ? "Deactivate" : "Activate"}
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
            <span className="text-sm font-medium">Contact Information</span>
            <Badge variant={family.isActive ? "default" : "secondary"}>
              {family.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        }
        headerClassName="border-b"
      >
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{family.phone}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{family.email || "—"}</p>
          </div>
          {family.notes && (
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="font-medium">{family.notes}</p>
            </div>
          )}
        </div>
      </Card>

      <Card
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Students ({family.students.length})
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/students/new?familyId=${id}`}>Add Student</Link>
            </Button>
          </div>
        }
        headerClassName="border-b"
      >
        {family.students.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">No students in this family yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {family.students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/admin/students/${student.id}`)}
              >
                <div>
                  <p className="font-medium">{student.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {student.enrollments.length > 0
                      ? student.enrollments.map((e) => e.class.name).join(", ")
                      : "No active enrollments"}
                  </p>
                </div>
                <Badge variant={student.isActive ? "default" : "secondary"}>
                  {student.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
