import { ArrowLeft } from "lucide-react";

import { PUBLIC_FONT_CLASS } from "@/app/(public)/fonts";
import { Button } from "@/components/common/button";
import { ContentStatusBadge } from "@/components/content/editor-parts";
import { Link } from "@/components/Link";
import type { ContentStatus } from "@/types/content";

import type { ReactNode } from "react";

type PreviewFrameProps = { status: ContentStatus; backHref: string; children: ReactNode };

/**
 * Shows a draft exactly as the website would, inside the portal. Only signed-in content users
 * reach it — the public pages themselves never serve anything unpublished.
 */
export function PreviewFrame({ status, backHref, children }: PreviewFrameProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/10 p-3">
        <div className="flex items-center gap-3">
          <ContentStatusBadge status={status} />
          <p className="text-sm text-foreground">
            {status === "PUBLISHED"
              ? "This is live on the website."
              : "Preview only. Visitors cannot see this until it is published."}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={backHref}>
            <ArrowLeft />
            Back to editing
          </Link>
        </Button>
      </div>
      <div className={`${PUBLIC_FONT_CLASS} overflow-hidden rounded-lg border bg-background font-public`}>{children}</div>
    </div>
  );
}
