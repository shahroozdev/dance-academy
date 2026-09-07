"use client";

import { Plus, UserCog } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/hooks/useRouter";

export default function TeachersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery("getTeachers", [{ search: search || undefined, page, pageSize: 20 }]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teachers"
        subtitle="Manage instructors and see which classes each one teaches."
        actions={
          <Button asChild>
            <Link href="/admin/teachers/new">
              <Plus className="size-4" />
              Add Teacher
            </Link>
          </Button>
        }
      />
      <Card
        header={
          <div className="flex items-center gap-2">
            <UserCog className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">All Teachers</span>
          </div>
        }
        headerClassName="border-b"
        contentClassName="flex min-h-0 flex-1 flex-col p-2"
      >
        <div className="flex items-center gap-2 p-2">
          <input
            type="text"
            placeholder="Search teachers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {isLoading && (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {!isLoading && !data?.data.length && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <UserCog className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No teachers found.</p>
          </div>
        )}
        {!isLoading && data && data.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Active Classes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((teacher) => (
                <TableRow
                  key={teacher.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/teachers/${teacher.id}`)}
                >
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>{teacher.email ?? "—"}</TableCell>
                  <TableCell>{teacher.phone ?? "—"}</TableCell>
                  <TableCell>{teacher.classCount}</TableCell>
                  <TableCell>
                    <Badge variant={teacher.isActive ? "default" : "secondary"}>
                      {teacher.isActive ? "Active" : "Inactive"}
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
              Page {page} of {data.pages} ({data.total} teachers)
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
