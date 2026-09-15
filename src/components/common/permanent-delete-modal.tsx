"use client";

import { useMemo } from "react";
import { z } from "zod";

import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";

type PermanentDeleteModalProps = {
  entityName: string;
  entityLabel: "student" | "family";
  impact: string;
  isLoading: boolean;
  error?: unknown;
  onConfirm: (confirmationName: string) => Promise<unknown>;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Deletion failed. Please try again.";
}

export function PermanentDeleteModal({
  entityName,
  entityLabel,
  impact,
  isLoading,
  error,
  onConfirm,
}: PermanentDeleteModalProps) {
  const schema = useMemo(
    () =>
      z.object({
        confirmationName: z
          .string()
          .refine((value) => value === entityName, `Enter the exact ${entityLabel} name.`),
      }),
    [entityLabel, entityName],
  );

  return (
    <Modal
      trigger={<Button variant="destructive">Delete Permanently</Button>}
      className="max-w-md"
      closeOnOutsideClick={!isLoading}
      title={
        <div>
          Delete {entityLabel === "student" ? "Student" : "Family"} Permanently?
          <p className="mt-1 text-sm font-normal text-muted-foreground">
            This cannot be undone.
          </p>
        </div>
      }
    >
      {({ close }) => (
        <FORM
          schema={schema}
          defaultValues={{ confirmationName: "" }}
          className="space-y-4"
          onSubmit={async ({ confirmationName }) => {
            await onConfirm(confirmationName);
            close();
          }}
        >
          {(form) => {
            const isConfirmed = form.watch("confirmationName") === entityName;
            return (
              <>
              <p className="text-sm text-muted-foreground">{impact}</p>
              <p className="text-sm">
                Type <span className="font-semibold text-foreground">{entityName}</span> to confirm.
              </p>
              <FormFeilds
                name="confirmationName"
                label={`Exact ${entityLabel} name`}
                disabled={isLoading}
                required
              />
              {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={isLoading} onClick={close}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isLoading || !isConfirmed}
                >
                  {isLoading ? "Deleting..." : "Delete Permanently"}
                </Button>
              </div>
              </>
            );
          }}
        </FORM>
      )}
    </Modal>
  );
}
