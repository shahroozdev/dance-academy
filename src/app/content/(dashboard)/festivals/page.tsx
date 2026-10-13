"use client";

import { PartyPopper, Plus } from "lucide-react";

import { Button } from "@/components/common/button";
import { ContentTable, type ContentColumn } from "@/components/content/content-table";
import { ContentStatusBadge } from "@/components/content/editor-parts";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import type { QueryData } from "@/hooks/query-registry";
import { useQuery } from "@/hooks/useQuery";
import { formatShortDate } from "@/lib/content-format";

type FestivalRow = QueryData<"getContentFestivals">[number];

const COLUMNS: ContentColumn<FestivalRow>[] = [
  { header: "Edition", cell: (festival) => <span className="font-medium">Ananta {festival.year}</span> },
  { header: "Label", cell: (festival) => festival.label },
  { header: "Date", cell: (festival) => formatShortDate(new Date(festival.eventDate)) },
  { header: "Venue", cell: (festival) => festival.venueName },
  { header: "Artists", cell: (festival) => festival._count.artists },
  { header: "Status", cell: (festival) => <ContentStatusBadge status={festival.status} /> },
];

export default function FestivalsPage() {
  const { data, isLoading, error } = useQuery("getContentFestivals", []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Festivals"
        subtitle="Each edition of the Malhaar Ananta Arts Festival: date, venue, artists, tickets, posters, videos, and sponsors."
        actions={
          <Button asChild>
            <Link href="/content/festivals/new">
              <Plus className="size-4" />
              Add Edition
            </Link>
          </Button>
        }
      />
      <ContentTable
        icon={PartyPopper}
        title="All Editions"
        rows={data}
        isLoading={isLoading}
        error={error}
        emptyMessage="No festival editions have been added here yet. Until one is, the website keeps showing its current festival page."
        columns={COLUMNS}
        rowKey={(festival) => festival.id}
        rowHref={(festival) => `/content/festivals/${festival.id}`}
      />
    </div>
  );
}
