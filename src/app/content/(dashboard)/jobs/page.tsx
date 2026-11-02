"use client";

import { BriefcaseBusiness, Plus } from "lucide-react";

import { Button } from "@/components/common/button";
import { ContentTable, type ContentColumn } from "@/components/content/content-table";
import { ContentStatusBadge } from "@/components/content/editor-parts";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import type { QueryData } from "@/hooks/query-registry";
import { useQuery } from "@/hooks/useQuery";

type JobRow = QueryData<"getContentJobOpenings">[number];

const COLUMNS: ContentColumn<JobRow>[] = [
  { header: "Position", cell: (job) => <span className="font-medium">{job.title}</span> },
  { header: "Location", cell: (job) => job.location ?? "—" },
  { header: "Type", cell: (job) => job.employmentType ?? "—" },
  { header: "Status", cell: (job) => <ContentStatusBadge status={job.status} /> },
];

export default function JobOpeningsPage() {
  const { data, isLoading, error } = useQuery("getContentJobOpenings", []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Job Openings"
        subtitle="Positions you are hiring for. Published openings appear on the Careers page and the home page."
        actions={
          <Button asChild>
            <Link href="/content/jobs/new">
              <Plus className="size-4" />
              Add Job Opening
            </Link>
          </Button>
        }
      />
      <ContentTable
        icon={BriefcaseBusiness}
        title="All Job Openings"
        rows={data}
        isLoading={isLoading}
        error={error}
        emptyMessage="No job openings have been added yet."
        columns={COLUMNS}
        rowKey={(job) => job.id}
        rowHref={(job) => `/content/jobs/${job.id}`}
      />
    </div>
  );
}
