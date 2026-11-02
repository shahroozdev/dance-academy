"use client";

import { FileText, Mail, Phone, Trash2 } from "lucide-react";
import { useState } from "react";

import { getJobApplicationResumeUrl } from "@/actions/content-inquiries";
import { JOB_APPLICATION_TOPIC } from "@/actions/inquiries.schema";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { useContentUser } from "@/components/content/content-user-context";
import { getErrorMessage } from "@/components/content/editor-parts";
import type { MutationArgs } from "@/hooks/mutation-registry";
import type { QueryData } from "@/hooks/query-registry";

export type Inquiry = QueryData<"getContentInquiries">["data"][number];
type InquiryStatus = Inquiry["status"];

export const STATUS_LABELS: Record<InquiryStatus, string> = { NEW: "New", READ: "Read", REPLIED: "Replied", ARCHIVED: "Archived" };
export const STATUS_BADGES = { NEW: "default", READ: "secondary", REPLIED: "outline", ARCHIVED: "outline" } as const;

export const formatWhen = (value: Date) => new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export const applicationPosition = (inquiry: Inquiry) => inquiry.jobTitle ?? "General application";

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

const replyHref = (inquiry: Inquiry, isApplication: boolean) => {
  const subject = isApplication
    ? `Re: your application to Malhaar Dance Company (${applicationPosition(inquiry)})`
    : `Re: your inquiry to Malhaar Dance Company (${inquiry.interestedIn})`;
  return `mailto:${inquiry.email}?subject=${encodeURIComponent(subject)}`;
};

const TEXT_BLOCK_CLASS = "rounded-md border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground";

/** Opens the applicant's resume through a link that only works for a few minutes. */
function ResumeButton({ inquiry }: { inquiry: Inquiry }) {
  const [failed, setFailed] = useState(false);

  // The window is opened before the link is fetched, so the browser does not treat it as a pop-up.
  const openResume = async () => {
    setFailed(false);
    const tab = window.open("", "_blank");
    try {
      const url = await getJobApplicationResumeUrl(inquiry.id);
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch {
      tab?.close();
      setFailed(true);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="outline" onClick={openResume}>
        <FileText />
        Open resume
      </Button>
      <span className="text-xs text-muted-foreground">{inquiry.resumeName}</span>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          The resume could not be opened. Please try again.
        </p>
      )}
    </div>
  );
}

type InquiryDetailProps = {
  inquiry: Inquiry;
  isSaving: boolean;
  error: unknown;
  onStatusChange: (...args: MutationArgs<"setInquiryStatus">) => void;
  /** Deletes a job application; offered to Content Owners only. */
  onDelete: (id: string) => void;
};

export function InquiryDetail({ inquiry, isSaving, error, onStatusChange, onDelete }: InquiryDetailProps) {
  const { isOwner } = useContentUser();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isApplication = inquiry.interestedIn === JOB_APPLICATION_TOPIC;
  const studentLine = [inquiry.studentName, inquiry.studentAge && `age ${inquiry.studentAge}`].filter(Boolean).join(", ");
  const details = [
    { label: isApplication ? "Position" : "Topic", value: isApplication ? applicationPosition(inquiry) : inquiry.interestedIn },
    { label: "Student", value: studentLine },
    { label: "Preferred location", value: inquiry.preferredLocation },
    { label: "Availability", value: inquiry.availability },
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

      {inquiry.experience && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Experience</span>
          <p className={TEXT_BLOCK_CLASS}>{inquiry.experience}</p>
        </div>
      )}
      {inquiry.message && <p className={TEXT_BLOCK_CLASS}>{inquiry.message}</p>}
      {inquiry.resumeName && <ResumeButton inquiry={inquiry} />}

      {!inquiry.emailAlertSent && (
        <p className="text-xs text-muted-foreground">
          The email alert for this message was not sent, so it may only have been seen here.
        </p>
      )}
      {Boolean(error) && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(error)}
        </p>
      )}

      {confirmingDelete ? (
        <div className="flex flex-col gap-3 rounded-md border border-destructive/40 p-3">
          <p className="text-sm text-foreground">
            Delete this application{inquiry.resumeName ? " and its resume" : ""} for good? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => setConfirmingDelete(false)}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" disabled={isSaving} onClick={() => onDelete(inquiry.id)}>
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          {isApplication && isOwner && (
            <Button type="button" variant="ghost" className="mr-auto text-destructive" disabled={isSaving} onClick={() => setConfirmingDelete(true)}>
              <Trash2 />
              Delete
            </Button>
          )}
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
            <a href={replyHref(inquiry, isApplication)}>
              <Mail />
              Reply by email
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
