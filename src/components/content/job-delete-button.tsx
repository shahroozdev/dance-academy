"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { useContentUser } from "@/components/content/content-user-context";
import { getErrorMessage } from "@/components/content/editor-parts";
import { useMutate } from "@/hooks/useMutate";
import { useRouter } from "@/hooks/useRouter";

type JobDeleteButtonProps = { id: string; title: string };

/** Deletes a job opening for good, after asking first. Shown to Content Owners only. */
export function JobDeleteButton({ id, title }: JobDeleteButtonProps) {
  const { isOwner } = useContentUser();
  const router = useRouter();
  const { mutate, isLoading, error } = useMutate("deleteJobOpening", {
    invalidateKeys: ["getContentJobOpenings", "getContentOverview"],
    onSuccess: () => router.push("/content/jobs"),
  });

  if (!isOwner) return null;

  return (
    <Modal
      title="Delete this job opening?"
      trigger={
        <Button type="button" variant="destructive">
          <Trash2 className="size-4" />
          Delete
        </Button>
      }
    >
      {({ close }) => (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            &ldquo;{title}&rdquo; will be removed from the website and from this list. This cannot be undone. To keep a
            copy for later, use Archive instead.
          </p>
          {Boolean(error) && (
            <p role="alert" className="text-sm text-destructive">
              {getErrorMessage(error)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={isLoading}>
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isLoading}
              onClick={async () => {
                try {
                  await mutate(id);
                } catch {
                  /* The error is shown above. */
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
