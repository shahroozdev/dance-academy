"use client";

import { Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getFamilies } from "@/actions/families";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/useQuery";
import { Link } from "@/components/Link";

export default function FamiliesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery("getFamilies", [{ search: search || undefined, page, pageSize: 20 }]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Families"
        subtitle="Manage family accounts, contacts, and household details."
        actions={
          <Button asChild>
            <Link href="/admin/families/new">
              <Plus className="size-4" />
              Add Family
            </Link>
          </Button>
        }
      />
      <Card
        header={
          <div className="flex items-center gap-2">
            <Users className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">All Families</span>
          </div>
        }
        headerClassName="border-b"
        contentClassName="flex min-h-0 flex-1 flex-col p-2"
      >
        <div className="flex items-center gap-2 p-2">
          <input
            type="text"
            placeholder="Search families..."
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
            <Users className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No families found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Family Name</TableHead>
                <TableHead>Parent/Guardian</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((family) => (
                <TableRow
                  key={family.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/families/${family.id}`)}
                >
                  <TableCell className="font-medium">{family.familyName}</TableCell>
                  <TableCell>{family.parentGuardianName}</TableCell>
                  <TableCell>{family.phone}</TableCell>
                  <TableCell>{family.studentCount}</TableCell>
                  <TableCell>
                    <Badge variant={family.isActive ? "default" : "secondary"}>
                      {family.isActive ? "Active" : "Inactive"}
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
              Page {page} of {data.pages} ({data.total} families)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
