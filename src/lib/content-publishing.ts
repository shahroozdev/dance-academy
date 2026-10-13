import type { ContentRole, ContentStatus } from "@/types/content";

// The publishing rules for website content (docs/content-portal-plan.md): only a Content Owner
// changes what is live, and a published item that is revised goes back to draft until it is
// published again.

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const ALLOWED_STATUS_CHANGES: Record<ContentStatus, readonly ContentStatus[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["DRAFT", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export const allowedStatusChanges = (from: ContentStatus) => ALLOWED_STATUS_CHANGES[from];

export function assertStatusChange(role: ContentRole, from: ContentStatus, to: ContentStatus) {
  if (role !== "OWNER") throw new Error("Only a Content Owner can publish, unpublish, or archive content.");
  if (!ALLOWED_STATUS_CHANGES[from].includes(to)) {
    throw new Error(`${CONTENT_STATUS_LABELS[from]} content cannot be changed to ${CONTENT_STATUS_LABELS[to].toLowerCase()}.`);
  }
}

/** Editors work on drafts only; anything live or archived is the owner's to revise. */
export const canRevise = (role: ContentRole, status: ContentStatus) => role === "OWNER" || status === "DRAFT";

export function assertCanRevise(role: ContentRole, status: ContentStatus) {
  if (!canRevise(role, status)) {
    throw new Error(`Only a Content Owner can change ${CONTENT_STATUS_LABELS[status].toLowerCase()} content.`);
  }
}

export const statusAfterRevision = (status: ContentStatus): ContentStatus => (status === "PUBLISHED" ? "DRAFT" : status);
