"use client";

import { Plus, Shapes } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Input } from "@/components/common/input";
import { Skeleton } from "@/components/common/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/hooks/useRouter";

export default function ProgramsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading } = useQuery("getPrograms", [{ search: search || undefined, page, pageSize }]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dance Programs"
        subtitle="Create each dance style once, then organize its levels and batches as classes."
        actions={<Button asChild><Link href="/admin/programs/new"><Plus className="size-4" />Add Program</Link></Button>}
      />
      <Card
        header={<div className="flex items-center gap-2"><Shapes className="size-5 text-muted-foreground" /><span className="text-sm font-medium">All Programs</span></div>}
        headerClassName="border-b"
        contentClassName="flex min-h-0 flex-1 flex-col p-2"
      >
        <div className="p-2">
          <Input
            type="text"
            placeholder="Search programs..."
            value={search}
            onChange={(value) => { setSearch(value); setPage(1); }}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        {isLoading && <div className="space-y-2 p-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>}
        {!isLoading && !data?.data.length && <div className="flex flex-col items-center gap-3 py-16 text-center"><Shapes className="size-10 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">No dance programs found.</p></div>}
        {!isLoading && data && data.data.length > 0 && (
          <Table>
            <TableHeader><TableRow><TableHead>Program</TableHead><TableHead>Classes</TableHead><TableHead>Active Classes</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{data.data.map((program) => (
              <TableRow key={program.id} className="cursor-pointer" onClick={() => router.push(`/admin/programs/${program.id}`)}>
                <TableCell className="font-medium">{program.name}</TableCell>
                <TableCell>{program.classCount}</TableCell>
                <TableCell>{program.activeClassCount}</TableCell>
                <TableCell><Badge variant={program.isActive ? "default" : "secondary"}>{program.isActive ? "Active" : "Inactive"}</Badge></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
        {data && <TablePagination page={page} pageSize={pageSize} total={data.total} pages={data.pages} itemLabel="programs" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}
      </Card>
    </div>
  );
}
