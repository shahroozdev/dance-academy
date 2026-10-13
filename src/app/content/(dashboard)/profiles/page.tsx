"use client";

import { ArrowDown, ArrowUp, Plus, UserRound } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/common/button";
import { ContentTable, type ContentColumn } from "@/components/content/content-table";
import { useContentUser } from "@/components/content/content-user-context";
import { VisibilityBadge } from "@/components/content/editor-parts";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import type { QueryData } from "@/hooks/query-registry";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

type ProfileRow = QueryData<"getContentProfiles">[number];

const BASE_COLUMNS: ContentColumn<ProfileRow>[] = [
  { header: "Name", cell: (profile) => <span className="font-medium">{profile.name}</span> },
  { header: "Title", cell: (profile) => profile.title },
  { header: "Website", cell: (profile) => <VisibilityBadge isVisible={profile.isVisible} /> },
];

export default function ProfilesPage() {
  const { isOwner } = useContentUser();
  const { data, isLoading, error } = useQuery("getContentProfiles", []);
  const { mutate: move, isLoading: isMoving } = useMutate("moveProfile", { invalidateKeys: ["getContentProfiles"] });

  const columns = useMemo<ContentColumn<ProfileRow>[]>(() => {
    if (!isOwner) return BASE_COLUMNS;
    return [
      ...BASE_COLUMNS,
      {
        header: "Order",
        cell: (profile) => (
          // Keeps a click on these buttons from also opening the profile (the row is clickable).
          <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Move ${profile.name} earlier`}
              disabled={isMoving}
              onClick={() => move(profile.id, "up")}
            >
              <ArrowUp />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Move ${profile.name} later`}
              disabled={isMoving}
              onClick={() => move(profile.id, "down")}
            >
              <ArrowDown />
            </Button>
          </div>
        ),
      },
    ];
  }, [isOwner, isMoving, move]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Public Profiles"
        subtitle="The founders and instructors shown on the website. A profile appears only while its website switch is on."
        actions={
          <Button asChild>
            <Link href="/content/profiles/new">
              <Plus className="size-4" />
              Add Profile
            </Link>
          </Button>
        }
      />
      <ContentTable
        icon={UserRound}
        title="All Profiles"
        rows={data}
        isLoading={isLoading}
        error={error}
        emptyMessage="No profiles have been added here yet. Until one is, the website keeps showing the two founders as it does today."
        columns={columns}
        rowKey={(profile) => profile.id}
        rowHref={(profile) => `/content/profiles/${profile.id}`}
      />
    </div>
  );
}
