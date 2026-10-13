"use client";

import { Inbox, Mail, Phone } from "lucide-react";
import { useState } from "react";

import { INQUIRY_INTERESTS } from "@/actions/inquiries.schema";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { ContentTable, type ContentColumn } from "@/components/content/content-table";
import { getErrorMessage } from "@/components/content/editor-parts";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import type { MutationArgs } from "@/hooks/mutation-registry";
import type { QueryArgs, QueryData, QueryKey } from "@/hooks/query-registry";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

type Inquiry = QueryData<"getContentInquiries">["data"][number];
type InquiryStatus = Inquiry["status"];
type StatusFilter = NonNullable<NonNullable<QueryArgs<"getContentInquiries">[0]>["status"]>;
type InterestFilter = NonNullable<NonNullable<QueryArgs<"getContentInquiries">[0]>["interest"]>;

const INVALIDATE_KEYS: QueryKey[] = ["getContentInquiries", "getContentInquirySummary"];

const STATUS_LABELS: Record<InquiryStatus, string> = { NEW: "New", READ: "Read", REPLIED: "Replied", ARCHIVED: "Archived" };
const STATUS_BADGES = { NEW: "default", READ: "secondary", REPLIED: "outline", ARCHIVED: "outline" } as const;

const STATUS_OPTIONS = [
  { label: "All except archived", value: "OPEN" },
  { label: "New", value: "NEW" },
  { label: "Read", value: "READ" },
  { label: "Replied", value: "REPLIED" },
  { label: "Archived", value: "ARCHIVED" },
];
const ALL_TOPICS = "ALL";
const TOPIC_OPTIONS = [{ label: "All topics", value: ALL_TOPICS }, ...INQUIRY_INTERESTS.map((value) => ({ label: value, value }))];

const formatWhen = (value: Date) => new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

const COLUMNS: ContentColumn<Inquiry>[] = [
  {
    header: "From",
    cell: (inquiry) => <span className={inquiry.status === "NEW" ? "font-semibold" : "font-medium"}>{inquiry.name}</span>,
  },
  { header: "Topic", cell: (inquiry) => inquiry.interestedIn },
  {
    header: "Message",
    cell: (inquiry) => <span className="line-clamp-1 max-w-xs text-muted-foreground">{inquiry.message}</span>,
    className: "whitespace-normal",
  },
  { header: "Received", cell: (inquiry) => formatWhen(inquiry.createdAt), className: "whitespace-nowrap" },
  { header: "Status", cell: (inquiry) => <Badge variant={STATUS_BADGES[inquiry.status]}>{STATUS_LABELS[inquiry.status]}</Badge> },
];

// What can be done with an inquiry from each state.
const NEXT_STEPS: Record<InquiryStatus, { label: string; to: InquiryStatus; variant: "default" | "outline" | "ghost" }[]> = {
  NEW: [
    { label: "Mark as replied", to: "REPLIED", variant: "default" },
    { label: "Archive", to: "ARCHIVED", variant: "ghost" },
  ],
  READ: [
    { label: "Mark as replied", to: "REPLIED", variant: "default" },
    { label: "Mark as new", to: "NEW", variant: "outline" },
    { label: "Archive", to: "ARCHIVED", variant: "ghost" },
  ],
  REPLIED: [
    { label: "Mark as not replied", to: "READ", variant: "outline" },
    { label: "Archive", to: "ARCHIVED", variant: "ghost" },
  ],
  ARCHIVED: [{ label: "Move back to the list", to: "READ", variant: "outline" }],
};

const replyHref = (inquiry: Inquiry) =>
  `mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: your inquiry to Malhaar Dance Company (${inquiry.interestedIn})`)}`;

type InquiryDetailProps = {
  inquiry: Inquiry;
  isSaving: boolean;
  error: unknown;
  onStatusChange: (...args: MutationArgs<"setInquiryStatus">) => void;
};

function InquiryDetail({ inquiry, isSaving, error, onStatusChange }: InquiryDetailProps) {
  const studentLine = [inquiry.studentName, inquiry.studentAge && `age ${inquiry.studentAge}`].filter(Boolean).join(", ");
  const details = [
    { label: "Topic", value: inquiry.interestedIn },
    { label: "Student", value: studentLine },
    { label: "Preferred location", value: inquiry.preferredLocation },
    { label: "Received", value: formatWhen(inquiry.createdAt) },
  ].filter((detail) => detail.value);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_BADGES[inquiry.status]}>{STATUS_LABELS[inquiry.status]}</Badge>
        {inquiry.handledByName && <span className="text-xs text-muted-foreground">Last updated by {inquiry.handledByName}</span>}
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <a href={`mailto:${inquiry.email}`} className="flex items-center gap-2 text-primary hover:underline">
          <Mail className="size-4" />
          {inquiry.email}
        </a>
        {inquiry.phone && (
          <a href={`tel:${inquiry.phone}`} className="flex items-center gap-2 text-primary hover:underline">
            <Phone className="size-4" />
            {inquiry.phone}
          </a>
        )}
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {details.map((detail) => (
          <div key={detail.label}>
            <dt className="text-xs text-muted-foreground">{detail.label}</dt>
            <dd className="text-foreground">{detail.value}</dd>
          </div>
        ))}
      </dl>

      <p className="rounded-md border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
        {inquiry.message}
      </p>

      {!inquiry.emailAlertSent && (
        <p className="text-xs text-muted-foreground">
          The email alert for this inquiry was not sent, so it may only have been seen here.
        </p>
      )}
      {Boolean(error) && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(error)}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        {NEXT_STEPS[inquiry.status].map((step) => (
          <Button
            key={step.label}
            type="button"
            variant={step.variant}
            disabled={isSaving}
            onClick={() => onStatusChange(inquiry.id, step.to)}
          >
            {step.label}
          </Button>
        ))}
        <Button asChild variant="outline">
          <a href={replyHref(inquiry)}>
            <Mail />
            Reply by email
          </a>
        </Button>
      </div>
    </div>
  );
}

export default function InquiriesPage() {
  const [status, setStatus] = useState<StatusFilter>("OPEN");
  const [topic, setTopic] = useState(ALL_TOPICS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<Inquiry | null>(null);

  const { data, isLoading, error } = useQuery("getContentInquiries", [
    {
      status,
      interest: topic === ALL_TOPICS ? undefined : (topic as InterestFilter),
      search: search || undefined,
      page,
      pageSize,
    },
  ]);
  const { mutate, isLoading: isSaving, error: saveError } = useMutate("setInquiryStatus", {
    invalidateKeys: INVALIDATE_KEYS,
    // Keeps the open window showing the inquiry even after it leaves the filtered list.
    onSuccess: (updated) => setSelected((current) => (current?.id === updated.id ? updated : current)),
  });

  const changeStatus = (...args: MutationArgs<"setInquiryStatus">) => {
    mutate(...args).catch(() => {
      /* The error is shown in the window. */
    });
  };

  const openInquiry = (inquiry: Inquiry) => {
    setSelected(inquiry);
    if (inquiry.status === "NEW") changeStatus(inquiry.id, "READ");
  };

  const resetPage = <Value,>(setter: (value: Value) => void) => (value: Value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inquiries"
        subtitle="Messages sent from the website's contact form. Opening one marks it as read."
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem_14rem]">
        <Input placeholder="Search by name, email, or message..." value={search} onChange={resetPage(setSearch)} />
        <Input type="select" options={TOPIC_OPTIONS} value={topic} onChange={resetPage(setTopic)} />
        <Input
          type="select"
          options={STATUS_OPTIONS}
          value={status}
          onChange={resetPage((value: string) => setStatus(value as StatusFilter))}
        />
      </div>
      <ContentTable
        icon={Inbox}
        title="Website Inquiries"
        rows={data?.data}
        isLoading={isLoading}
        error={error}
        emptyMessage="No inquiries match. New messages from the website's contact form appear here."
        columns={COLUMNS}
        rowKey={(inquiry) => inquiry.id}
        onRowClick={openInquiry}
        footer={
          data && (
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={data.total}
              pages={data.pages}
              itemLabel="inquiries"
              onPageChange={setPage}
              onPageSizeChange={resetPage(setPageSize)}
            />
          )
        }
      />
      <Modal
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected ? `Inquiry from ${selected.name}` : undefined}
        className="max-h-[85dvh] max-w-xl overflow-y-auto"
      >
        {() => selected && <InquiryDetail inquiry={selected} isSaving={isSaving} error={saveError} onStatusChange={changeStatus} />}
      </Modal>
    </div>
  );
}
