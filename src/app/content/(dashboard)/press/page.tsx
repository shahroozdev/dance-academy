"use client";

import { Newspaper, Plus } from "lucide-react";

import { Button } from "@/components/common/button";
import { ContentTable, type ContentColumn } from "@/components/content/content-table";
import { ContentStatusBadge } from "@/components/content/editor-parts";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import type { QueryData } from "@/hooks/query-registry";
import { useQuery } from "@/hooks/useQuery";
import { formatShortDate } from "@/lib/content-format";
import { PRESS_KIND_LABELS } from "@/lib/content-mappers";

type PressRow = QueryData<"getContentPressItems">[number];

const COLUMNS: ContentColumn<PressRow>[] = [
  { header: "Title", cell: (item) => <span className="font-medium">{item.title}</span> },
  { header: "Outlet", cell: (item) => item.outlet ?? "—" },
  { header: "Type", cell: (item) => PRESS_KIND_LABELS[item.kind] },
  { header: "Published on", cell: (item) => (item.publishedOn ? formatShortDate(new Date(item.publishedOn)) : "—") },
  { header: "Status", cell: (item) => <ContentStatusBadge status={item.status} /> },
];

export default function PressPage() {
  const { data, isLoading, error } = useQuery("getContentPressItems", []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Press & Media"
        subtitle="Articles, interviews, features, videos, and media appearances shown on the Press & Media page."
        actions={
          <Button asChild>
            <Link href="/content/press/new">
              <Plus className="size-4" />
              Add Press Item
            </Link>
          </Button>
        }
      />
      <ContentTable
        icon={Newspaper}
        title="All Press Items"
        rows={data}
        isLoading={isLoading}
        error={error}
        emptyMessage="No press items have been added yet."
        columns={COLUMNS}
        rowKey={(item) => item.id}
        rowHref={(item) => `/content/press/${item.id}`}
      />
    </div>
  );
}
