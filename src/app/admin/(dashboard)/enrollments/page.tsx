"use client";

import { ListChecks, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { getEnrollments } from "@/actions/enrollments";
import { endEnrollment } from "@/actions/enrollments";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Modal } from "@/components/common/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { Link } from "@/components/Link";

export default function EnrollmentsPage() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId") ?? undefined;
  const classId = searchParams.get("classId") ?? undefined;
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, refetch } = useQuery("getEnrollments", [{ studentId, classId, page: 1, pageSize: 50 }]);
  const { mutate: endEnroll } = useMutate("endEnrollment", {
    invalidateKeys: ["getEnrollments", "getStudents", "getClasses"],
    onSuccess: () => refetch(),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Enrollments"
        subtitle="Manage student class enrollments."
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="size-4" />
            Add Enrollment
          </Button>
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
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ListChecks className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No enrollments found.</p>
          </div>
        ) : (
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
                  <TableCell>{new Date(enrollment.startDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={enrollment.status === "ACTIVE" ? "default" : "secondary"}>
                      {enrollment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {enrollment.status === "ACTIVE" && (
                      <Modal
                        trigger={
                          <Button variant="destructive" size="sm">End</Button>
                        }
                        className="max-w-sm"
                      >
                        {({ close }) => (
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-lg font-medium">End Enrollment?</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                This will end {enrollment.student.fullName}&apos;s enrollment in {enrollment.class.name}.
                              </p>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={close}>Cancel</Button>
                              <Button
                                variant="destructive"
                                onClick={async () => {
                                  await endEnroll(enrollment.id);
                                  close();
                                }}
                              >
                                End Enrollment
                              </Button>
                            </div>
                          </div>
                        )}
                      </Modal>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <EnrollmentsCreateModal open={showCreate} onOpenChange={setShowCreate} onCreated={() => refetch()} />
    </div>
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

  const { data: studentsData } = useQuery("getStudents", [{ pageSize: 100 }]);
  const { data: classesData } = useQuery("getClasses", [{ pageSize: 100 }]);

  const { mutate: createEnroll, isLoading } = useMutate("createEnrollment", {
    invalidateKeys: ["getEnrollments", "getStudents", "getClasses"],
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
      setStudentId("");
      setClassId("");
    },
  });

  const studentOptions = studentsData?.data.map((s) => ({ label: `${s.fullName} (${s.familyName})`, value: s.id })) ?? [];
  const classOptions = classesData?.data.map((c) => ({ label: `${c.name} — ${c.danceStyle}`, value: c.id })) ?? [];

  return (
    <Modal open={open} onOpenChange={onOpenChange} className="max-w-md">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Add Enrollment</h3>
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
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!studentId || !classId || isLoading}
            onClick={async () => {
              await createEnroll({ studentId, classId });
            }}
          >
            {isLoading ? "Creating..." : "Create Enrollment"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
