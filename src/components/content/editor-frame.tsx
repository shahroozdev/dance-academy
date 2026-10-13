"use client";

import { Eye } from "lucide-react";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { useContentUser } from "@/components/content/content-user-context";
import { ContentStatusBadge, EditorNotice } from "@/components/content/editor-parts";
import { PublishControls } from "@/components/content/publish-controls";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import type { QueryKey } from "@/hooks/query-registry";
import { canRevise } from "@/lib/content-publishing";
import type { ContentEntity, ContentStatus } from "@/types/content";

import type { ReactNode } from "react";

type PublishedBy = { publishedAt: Date | null; publishedByName: string | null };

type EditorFrameProps = PublishedBy & {
  title: string;
  entity: ContentEntity;
  id: string;
  status: ContentStatus;
  invalidateKeys: QueryKey[];
  /** The draft preview page, for content that has its own public page. */
  previewHref?: string;
  children: ReactNode;
};

const publishedLine = ({ publishedAt, publishedByName }: PublishedBy) =>
  publishedAt
    ? `Last published ${new Date(publishedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}${publishedByName ? ` by ${publishedByName}` : ""}.`
    : "Not published yet.";

/** The frame around an edit form: title, status, preview, publishing controls, and plain-language notices. */
export function EditorFrame({
  title,
  entity,
  id,
  status,
  invalidateKeys,
  previewHref,
  publishedAt,
  publishedByName,
  children,
}: EditorFrameProps) {
  const { role, isOwner } = useContentUser();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        subtitle={publishedLine({ publishedAt, publishedByName })}
        actions={
          <>
            <ContentStatusBadge status={status} />
            {previewHref && (
              <Button asChild variant="outline">
                <Link href={previewHref}>
                  <Eye />
                  Preview
                </Link>
              </Button>
            )}
            <PublishControls entity={entity} id={id} status={status} invalidateKeys={invalidateKeys} />
          </>
        }
      />
      {!canRevise(role, status) && (
        <EditorNotice>
          This is {status === "PUBLISHED" ? "live on the website" : "archived"}, so only a Content Owner can change it.
          You can still read it here.
        </EditorNotice>
      )}
      {isOwner && status === "PUBLISHED" && (
        <EditorNotice>
          This is live on the website. Saving a change returns it to draft, which takes it off the website until you
          publish it again.
        </EditorNotice>
      )}
      <Card>{children}</Card>
    </div>
  );
}
