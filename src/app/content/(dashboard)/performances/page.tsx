"use client";

import { FilePenLine, Plus } from "lucide-react";

import { Button } from "@/components/common/button";
import { ContentTable, type ContentColumn } from "@/components/content/content-table";
import { ContentStatusBadge } from "@/components/content/editor-parts";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import type { QueryData } from "@/hooks/query-registry";
import { useQuery } from "@/hooks/useQuery";
import { formatShortDate } from "@/lib/content-format";

type PerformanceRow = QueryData<"getContentPerformances">[number];

const COLUMNS: ContentColumn<PerformanceRow>[] = [
  { header: "Title", cell: (performance) => <span className="font-medium">{performance.title}</span> },
  {
    header: "Date",
    cell: (performance) => (performance.eventDate ? formatShortDate(new Date(performance.eventDate)) : "—"),
  },
  { header: "Venue", cell: (performance) => performance.venue ?? "—" },
  { header: "Photos", cell: (performance) => performance._count.media },
  { header: "Status", cell: (performance) => <ContentStatusBadge status={performance.status} /> },
];

export default function PerformancesPage() {
  const { data, isLoading, error } = useQuery("getContentPerformances", []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Performances"
        subtitle="Productions and performances, each with its own page, cover, gallery, and links."
        actions={
          <Button asChild>
            <Link href="/content/performances/new">
              <Plus className="size-4" />
              Add Performance
            </Link>
          </Button>
        }
      />
      <ContentTable
        icon={FilePenLine}
        title="All Performances"
        rows={data}
        isLoading={isLoading}
        error={error}
        emptyMessage="No performances have been added yet. Until one is published, the Performances page keeps showing its current photo grid."
        columns={COLUMNS}
        rowKey={(performance) => performance.id}
        rowHref={(performance) => `/content/performances/${performance.id}`}
      />
    </div>
  );
}
