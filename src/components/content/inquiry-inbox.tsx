"use client";

import { FileUser, Inbox, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { GENERAL_APPLICATION, INQUIRY_INTERESTS } from "@/actions/inquiries.schema";
import { Badge } from "@/components/common/badge";
import { Input, type InputOption } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { ContentTable, type ContentColumn } from "@/components/content/content-table";
import {
  InquiryDetail,
  STATUS_BADGES,
  STATUS_LABELS,
  applicationPosition,
  formatWhen,
  type Inquiry,
} from "@/components/content/inquiry-detail";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import type { MutationArgs } from "@/hooks/mutation-registry";
import type { QueryArgs, QueryKey } from "@/hooks/query-registry";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

type ListQuery = NonNullable<QueryArgs<"getContentInquiries">[0]>;
type StatusFilter = NonNullable<ListQuery["status"]>;
type InterestFilter = NonNullable<ListQuery["interest"]>;
export type InboxKind = NonNullable<ListQuery["kind"]>;

const INVALIDATE_KEYS: QueryKey[] = ["getContentInquiries", "getContentInquirySummary"];

const STATUS_OPTIONS = [
  { label: "All except archived", value: "OPEN" },
  { label: "New", value: "NEW" },
  { label: "Read", value: "READ" },
  { label: "Replied", value: "REPLIED" },
  { label: "Archived", value: "ARCHIVED" },
];
const ALL = "ALL";
const TOPIC_OPTIONS = [{ label: "All topics", value: ALL }, ...INQUIRY_INTERESTS.map((value) => ({ label: value, value }))];

type InboxConfig = {
  title: string;
  subtitle: string;
  tableTitle: string;
  icon: LucideIcon;
  emptyMessage: string;
  searchPlaceholder: string;
  itemLabel: string;
  modalTitle: (name: string) => string;
  columns: ContentColumn<Inquiry>[];
};

const buildColumns = (subject: ContentColumn<Inquiry>, preview: (inquiry: Inquiry) => string | null): ContentColumn<Inquiry>[] => [
  {
    header: "From",
    cell: (inquiry) => <span className={inquiry.status === "NEW" ? "font-semibold" : "font-medium"}>{inquiry.name}</span>,
  },
  subject,
  {
    header: "Message",
    cell: (inquiry) => <span className="line-clamp-1 max-w-xs text-muted-foreground">{preview(inquiry)}</span>,
    className: "whitespace-normal",
  },
  { header: "Received", cell: (inquiry) => formatWhen(inquiry.createdAt), className: "whitespace-nowrap" },
  { header: "Status", cell: (inquiry) => <Badge variant={STATUS_BADGES[inquiry.status]}>{STATUS_LABELS[inquiry.status]}</Badge> },
];

// Contact-form messages and job applications are kept together but read on separate screens.
const INBOXES: Record<InboxKind, InboxConfig> = {
  inquiries: {
    title: "Inquiries",
    subtitle: "Messages sent from the website's contact form. Opening one marks it as read.",
    tableTitle: "Website Inquiries",
    icon: Inbox,
    emptyMessage: "No inquiries match. New messages from the website's contact form appear here.",
    searchPlaceholder: "Search by name, email, or message...",
    itemLabel: "inquiries",
    modalTitle: (name) => `Inquiry from ${name}`,
    columns: buildColumns({ header: "Topic", cell: (inquiry) => inquiry.interestedIn }, (inquiry) => inquiry.message),
  },
  applications: {
    title: "Job Applications",
    subtitle: "Applications sent from the website's Careers page. Opening one marks it as read.",
    tableTitle: "Applications",
    icon: FileUser,
    emptyMessage: "No applications match. Applications sent from the Careers page appear here.",
    searchPlaceholder: "Search by name, email, position, or message...",
    itemLabel: "applications",
    modalTitle: (name) => `Application from ${name}`,
    columns: buildColumns({ header: "Position", cell: applicationPosition }, (inquiry) => inquiry.experience),
  },
};

/** One list of website messages, either the contact form's inquiries or job applications. */
export function InquiryInbox({ kind }: { kind: InboxKind }) {
  const inbox = INBOXES[kind];
  const isApplications = kind === "applications";
  const [status, setStatus] = useState<StatusFilter>("OPEN");
  // The topic for inquiries, or the position for applications.
  const [filter, setFilter] = useState(ALL);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<Inquiry | null>(null);

  const { data: openings } = useQuery("getContentJobOpenings", [], { enabled: isApplications });
  const filterOptions = useMemo<InputOption[]>(
    () =>
      isApplications
        ? [
            { label: "All positions", value: ALL },
            { label: "General applications", value: GENERAL_APPLICATION },
            ...(openings ?? []).map((job) => ({ label: job.title, value: job.id })),
          ]
        : TOPIC_OPTIONS,
    [isApplications, openings],
  );

  const chosen = filter === ALL ? undefined : filter;
  const { data, isLoading, error } = useQuery("getContentInquiries", [
    {
      kind,
      status,
      interest: isApplications ? undefined : (chosen as InterestFilter | undefined),
      position: isApplications ? chosen : undefined,
      search: search || undefined,
      page,
      pageSize,
    },
  ]);
  const { mutate, isLoading: isSaving, error: saveError } = useMutate("setInquiryStatus", {
    invalidateKeys: INVALIDATE_KEYS,
    // Keeps the open window showing the message even after it leaves the filtered list.
    onSuccess: (updated) => setSelected((current) => (current?.id === updated.id ? updated : current)),
  });
  const { mutate: remove, isLoading: isDeleting, error: deleteError } = useMutate("deleteJobApplication", {
    invalidateKeys: INVALIDATE_KEYS,
    onSuccess: () => setSelected(null),
  });

  const changeStatus = (...args: MutationArgs<"setInquiryStatus">) => {
    mutate(...args).catch(() => {
      /* The error is shown in the window. */
    });
  };

  const deleteApplication = (id: string) => {
    remove(id).catch(() => {
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
      <PageHeader title={inbox.title} subtitle={inbox.subtitle} />
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem_14rem]">
        <Input placeholder={inbox.searchPlaceholder} value={search} onChange={resetPage(setSearch)} />
        <Input type="select" options={filterOptions} value={filter} onChange={resetPage(setFilter)} />
        <Input
          type="select"
          options={STATUS_OPTIONS}
          value={status}
          onChange={resetPage((value: string) => setStatus(value as StatusFilter))}
        />
      </div>
      <ContentTable
        icon={inbox.icon}
        title={inbox.tableTitle}
        rows={data?.data}
        isLoading={isLoading}
        error={error}
        emptyMessage={inbox.emptyMessage}
        columns={inbox.columns}
        rowKey={(inquiry) => inquiry.id}
        onRowClick={openInquiry}
        footer={
          data && (
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={data.total}
              pages={data.pages}
              itemLabel={inbox.itemLabel}
              onPageChange={setPage}
              onPageSizeChange={resetPage(setPageSize)}
            />
          )
        }
      />
      <Modal
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected ? inbox.modalTitle(selected.name) : undefined}
        className="max-h-[85dvh] max-w-xl overflow-y-auto"
      >
        {() =>
          selected && (
            <InquiryDetail
              inquiry={selected}
              isSaving={isSaving || isDeleting}
              error={saveError ?? deleteError}
              onStatusChange={changeStatus}
              onDelete={deleteApplication}
            />
          )
        }
      </Modal>
    </div>
  );
}
