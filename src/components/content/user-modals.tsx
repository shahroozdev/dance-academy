"use client";

import { Plus } from "lucide-react";

import {
  contentPasswordSchema,
  contentUserCreateSchema,
  contentUserUpdateSchema,
  type ContentPasswordInput,
  type ContentUserCreateInput,
  type ContentUserUpdateInput,
} from "@/actions/content.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { Switch } from "@/components/common/switch";
import { ModalFooter } from "@/components/content/editor-parts";
import type { QueryData, QueryKey } from "@/hooks/query-registry";
import { useMutate } from "@/hooks/useMutate";

type ContentUserRow = QueryData<"getContentUsers">[number];

const INVALIDATE_KEYS: QueryKey[] = ["getContentUsers"];

const ROLE_OPTIONS = [
  { label: "Content Editor — writes drafts and adds files", value: "EDITOR" },
  { label: "Content Owner — also publishes and manages users", value: "OWNER" },
];

const EMPTY_USER: ContentUserCreateInput = { name: "", email: "", role: "EDITOR", password: "" };
const EMPTY_PASSWORD: ContentPasswordInput = { password: "" };

export function AddContentUserModal() {
  const { mutate, isLoading, error } = useMutate("createContentUser", { invalidateKeys: INVALIDATE_KEYS });

  return (
    <Modal
      title="Add a content user"
      className="max-w-md"
      closeOnOutsideClick={!isLoading}
      trigger={
        <Button>
          <Plus className="size-4" />
          Add User
        </Button>
      }
    >
      {({ close }) => (
        <FORM
          schema={contentUserCreateSchema}
          defaultValues={EMPTY_USER}
          className="space-y-4"
          onSubmit={async (values) => {
            try {
              await mutate(values);
              close();
            } catch {
              /* The error is shown below. */
            }
          }}
        >
          <FormFeilds<ContentUserCreateInput> name="name" label="Name" required />
          <FormFeilds<ContentUserCreateInput> name="email" label="Email" type="email" required />
          <FormFeilds<ContentUserCreateInput> name="role" label="Role" type="select" options={ROLE_OPTIONS} />
          <FormFeilds<ContentUserCreateInput>
            name="password"
            label="Starting password"
            type="password"
            placeholder="At least 10 characters"
            required
          />
          <p className="text-sm text-muted-foreground">Share the password with this person privately; it is not emailed.</p>
          <ModalFooter error={error} isLoading={isLoading} submitLabel="Add user" onCancel={close} />
        </FORM>
      )}
    </Modal>
  );
}

export function EditContentUserModal({ user }: { user: ContentUserRow }) {
  const { mutate, isLoading, error } = useMutate("updateContentUser", { invalidateKeys: INVALIDATE_KEYS });
  const defaultValues: ContentUserUpdateInput = { name: user.name, role: user.role, isActive: user.isActive };

  return (
    <Modal
      title={`Edit ${user.name}`}
      className="max-w-md"
      closeOnOutsideClick={!isLoading}
      trigger={
        <Button variant="outline" size="sm">
          Edit
        </Button>
      }
    >
      {({ close }) => (
        <FORM
          schema={contentUserUpdateSchema}
          defaultValues={defaultValues}
          className="space-y-4"
          onSubmit={async (values) => {
            try {
              await mutate(user.id, values);
              close();
            } catch {
              /* The error is shown below. */
            }
          }}
        >
          {(form) => (
            <>
              <FormFeilds<ContentUserUpdateInput> name="name" label="Name" required />
              <FormFeilds<ContentUserUpdateInput> name="role" label="Role" type="select" options={ROLE_OPTIONS} />
              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div className="min-w-0">
                  <label htmlFor={`user-active-${user.id}`} className="text-sm font-medium">
                    Can sign in
                  </label>
                  <p className="text-sm text-muted-foreground">Turn off to block this person without deleting their history.</p>
                </div>
                <Switch
                  id={`user-active-${user.id}`}
                  checked={form.watch("isActive")}
                  onCheckedChange={(checked) => form.setValue("isActive", checked, { shouldDirty: true })}
                  disabled={isLoading}
                />
              </div>
              <ModalFooter error={error} isLoading={isLoading} submitLabel="Save" onCancel={close} />
            </>
          )}
        </FORM>
      )}
    </Modal>
  );
}

export function SetContentPasswordModal({ user }: { user: ContentUserRow }) {
  const { mutate, isLoading, error } = useMutate("setContentUserPassword");

  return (
    <Modal
      title={`Set a new password for ${user.name}`}
      className="max-w-md"
      closeOnOutsideClick={!isLoading}
      trigger={
        <Button variant="ghost" size="sm">
          New password
        </Button>
      }
    >
      {({ close }) => (
        <FORM
          schema={contentPasswordSchema}
          defaultValues={EMPTY_PASSWORD}
          className="space-y-4"
          onSubmit={async (values) => {
            try {
              await mutate(user.id, values);
              close();
            } catch {
              /* The error is shown below. */
            }
          }}
        >
          <FormFeilds<ContentPasswordInput>
            name="password"
            label="New password"
            type="password"
            placeholder="At least 10 characters"
            required
          />
          <ModalFooter error={error} isLoading={isLoading} submitLabel="Set password" onCancel={close} />
        </FORM>
      )}
    </Modal>
  );
}
