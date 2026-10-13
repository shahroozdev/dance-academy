import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Skeleton } from "@/components/common/skeleton";
import { Link } from "@/components/Link";
import { CONTENT_STATUS_LABELS } from "@/lib/content-publishing";
import type { ContentStatus } from "@/types/content";

import type { ReactNode } from "react";

// Small pieces shared by every editing screen in the Content Portal.

export const getErrorMessage = (error: unknown, fallback = "Something went wrong. Please try again.") =>
  error instanceof Error ? error.message : fallback;

const STATUS_BADGE_VARIANTS = { DRAFT: "secondary", PUBLISHED: "default", ARCHIVED: "outline" } as const;

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  return <Badge variant={STATUS_BADGE_VARIANTS[status]}>{CONTENT_STATUS_LABELS[status]}</Badge>;
}

export function VisibilityBadge({ isVisible }: { isVisible: boolean }) {
  return <Badge variant={isVisible ? "default" : "secondary"}>{isVisible ? "On the website" : "Hidden"}</Badge>;
}

export function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export function NotFoundState({ label, backHref }: { label: string; backHref: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <p className="text-muted-foreground">This {label} could not be found.</p>
      <Button asChild variant="outline">
        <Link href={backHref}>Back to the list</Link>
      </Button>
    </div>
  );
}

/** A plain-language notice above a form, e.g. why it is read-only or what saving will do. */
export function EditorNotice({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">{children}</p>;
}

type FormFooterProps = {
  error?: unknown;
  cancelHref: string;
  isSaving: boolean;
  submitLabel: string;
  disabled?: boolean;
};

export function FormFooter({ error, cancelHref, isSaving, submitLabel, disabled = false }: FormFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      {Boolean(error) && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(error)}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" type="button" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={isSaving || disabled}>
          {isSaving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

/** A titled group of fields inside a form. */
export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

type ModalFooterProps = { error: unknown; isLoading: boolean; submitLabel: string; onCancel: () => void };

/** The error line and Cancel/Save buttons at the bottom of a form inside a modal. */
export function ModalFooter({ error, isLoading, submitLabel, onCancel }: ModalFooterProps) {
  return (
    <>
      {Boolean(error) && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(error)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={isLoading} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </>
  );
}
