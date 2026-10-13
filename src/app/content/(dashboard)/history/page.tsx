"use client";

import { History } from "lucide-react";
import { useState } from "react";

import { ContentTable, type ContentColumn } from "@/components/content/content-table";
import { useContentUser } from "@/components/content/content-user-context";
import { EditorNotice } from "@/components/content/editor-parts";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import type { QueryData } from "@/hooks/query-registry";
import { useQuery } from "@/hooks/useQuery";

type HistoryRow = QueryData<"getContentHistory">["data"][number];

const formatWhen = (value: Date) => new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

const COLUMNS: ContentColumn<HistoryRow>[] = [
  { header: "When", cell: (entry) => formatWhen(entry.createdAt), className: "whitespace-nowrap" },
  { header: "Who", cell: (entry) => entry.userName },
  { header: "What happened", cell: (entry) => entry.summary, className: "whitespace-normal" },
];

export default function ContentHistoryPage() {
  const { isOwner } = useContentUser();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading, error } = useQuery("getContentHistory", [{ page, pageSize }], { enabled: isOwner });

  if (!isOwner) return <EditorNotice>Only a Content Owner can see the content history.</EditorNotice>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="History"
        subtitle="A record of every change made in this portal: who created, edited, published, or archived what, and when."
      />
      <ContentTable
        icon={History}
        title="Recent Changes"
        rows={data?.data}
        isLoading={isLoading}
        error={error}
        emptyMessage="Nothing has been changed in the portal yet."
        columns={COLUMNS}
        rowKey={(entry) => entry.id}
        footer={
          data && (
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={data.total}
              pages={data.pages}
              itemLabel="changes"
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )
        }
      />
    </div>
  );
}
