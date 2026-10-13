"use client";

import { Button } from "@/components/common/button";
import { useContentUser } from "@/components/content/content-user-context";
import { getErrorMessage } from "@/components/content/editor-parts";
import type { QueryKey } from "@/hooks/query-registry";
import { useMutate } from "@/hooks/useMutate";
import type { ContentEntity, ContentStatus } from "@/types/content";

type StatusAction = { label: string; to: ContentStatus; variant: "default" | "outline" };

const ACTIONS_BY_STATUS: Record<ContentStatus, StatusAction[]> = {
  DRAFT: [
    { label: "Publish", to: "PUBLISHED", variant: "default" },
    { label: "Archive", to: "ARCHIVED", variant: "outline" },
  ],
  PUBLISHED: [
    { label: "Unpublish", to: "DRAFT", variant: "outline" },
    { label: "Archive", to: "ARCHIVED", variant: "outline" },
  ],
  ARCHIVED: [{ label: "Restore as draft", to: "DRAFT", variant: "outline" }],
};

type PublishControlsProps = {
  entity: ContentEntity;
  id: string;
  status: ContentStatus;
  /** The queries showing this item, refreshed after its status changes. */
  invalidateKeys: QueryKey[];
};

/** Publish, unpublish, archive, and restore. Shown to Content Owners only. */
export function PublishControls({ entity, id, status, invalidateKeys }: PublishControlsProps) {
  const { isOwner } = useContentUser();
  const { mutate, isLoading, error } = useMutate("setContentStatus", { invalidateKeys });

  if (!isOwner) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {ACTIONS_BY_STATUS[status].map((action) => (
          <Button
            key={action.to}
            type="button"
            variant={action.variant}
            disabled={isLoading}
            onClick={async () => {
              try {
                await mutate(entity, id, action.to);
              } catch {
                /* The error is shown below. */
              }
            }}
          >
            {action.label}
          </Button>
        ))}
      </div>
      {Boolean(error) && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(error)}
        </p>
      )}
    </div>
  );
}
