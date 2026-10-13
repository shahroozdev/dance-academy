"use client";

import { Users } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { ContentTable, type ContentColumn } from "@/components/content/content-table";
import { useContentUser } from "@/components/content/content-user-context";
import { EditorNotice } from "@/components/content/editor-parts";
import { AddContentUserModal, EditContentUserModal, SetContentPasswordModal } from "@/components/content/user-modals";
import { PageHeader } from "@/components/shared/page-header";
import type { QueryData } from "@/hooks/query-registry";
import { useQuery } from "@/hooks/useQuery";

type ContentUserRow = QueryData<"getContentUsers">[number];

const ROLE_LABELS = { OWNER: "Content Owner", EDITOR: "Content Editor" };

const COLUMNS: ContentColumn<ContentUserRow>[] = [
  { header: "Name", cell: (user) => <span className="font-medium">{user.name}</span> },
  { header: "Email", cell: (user) => user.email },
  { header: "Role", cell: (user) => ROLE_LABELS[user.role] },
  {
    header: "Sign-in",
    cell: (user) => <Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Active" : "Deactivated"}</Badge>,
  },
  {
    header: "Actions",
    cell: (user) => (
      <div className="flex flex-wrap gap-2">
        <EditContentUserModal user={user} />
        <SetContentPasswordModal user={user} />
      </div>
    ),
  },
];

export default function ContentUsersPage() {
  const { isOwner } = useContentUser();
  const { data, isLoading, error } = useQuery("getContentUsers", [], { enabled: isOwner });

  if (!isOwner) return <EditorNotice>Only a Content Owner can manage content users.</EditorNotice>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Content Users"
        subtitle="The people who can sign in to this portal. These accounts are separate from Studio Admin accounts."
        actions={<AddContentUserModal />}
      />
      <ContentTable
        icon={Users}
        title="All Users"
        rows={data}
        isLoading={isLoading}
        error={error}
        emptyMessage="No content users yet."
        columns={COLUMNS}
        rowKey={(user) => user.id}
      />
    </div>
  );
}
