"use client";

import { GraduationCap, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getStudents } from "@/actions/students";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/useQuery";

export default function StudentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery("getStudents", [{ search: search || undefined, page, pageSize: 20 }]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Students"
        subtitle="Track enrolled students, profiles, and class history."
        actions={
          <Button asChild>
            <Link href="/admin/students/new">
              <Plus className="size-4" />
              Add Student
            </Link>
          </Button>
        }
      />
      <Card
        header={
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">All Students</span>
          </div>
        }
        headerClassName="border-b"
        contentClassName="flex min-h-0 flex-1 flex-col p-2"
      >
        <div className="flex items-center gap-2 p-2">
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <GraduationCap className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No students found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Active Classes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((student) => (
                <TableRow
                  key={student.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/students/${student.id}`)}
                >
                  <TableCell className="font-medium">{student.fullName}</TableCell>
                  <TableCell>{student.familyName}</TableCell>
                  <TableCell>
                    {student.enrollments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {student.enrollments.map((e, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {e.className}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={student.isActive ? "default" : "secondary"}>
                      {student.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-2">
            <p className="text-sm text-muted-foreground">
              Page {page} of {data.pages} ({data.total} students)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
