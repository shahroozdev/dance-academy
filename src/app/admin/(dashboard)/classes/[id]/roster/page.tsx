"use client";

import { useParams } from "next/navigation";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/useQuery";

export default function ClassRosterPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: cls, isLoading: isLoadingClass } = useQuery("getClassById", [id]);
  const { data: roster, isLoading: isLoadingRoster } = useQuery("getClassRoster", [id]);

  const isLoading = isLoadingClass || isLoadingRoster;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={cls ? `${cls.name} — Roster` : "Class Roster"}
        subtitle={cls ? `${cls.enrollments?.length ?? 0} students enrolled` : "Loading..."}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/admin/classes/${id}`}>Back to Class</Link>
          </Button>
        }
      />

      <Card
        header={
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Currently Enrolled Students</span>
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
        {!isLoading && !roster?.length && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">No students enrolled in this class.</p>
          </div>
        )}
        {!isLoading && roster && roster.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Enrolled Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((enrollment) => (
                <TableRow
                  key={enrollment.id}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">
                    <Link href={`/admin/students/${enrollment.studentId}`} className="hover:underline">
                      {enrollment.student.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{enrollment.student.family.familyName}</TableCell>
                  <TableCell>{enrollment.student.family.phone}</TableCell>
                  <TableCell>{new Date(enrollment.startDate).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
