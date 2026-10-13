"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";

import { Card } from "@/components/common/card";
import { useContentUser } from "@/components/content/content-user-context";
import { EditorNotice, EditorSkeleton, NotFoundState, VisibilityBadge } from "@/components/content/editor-parts";
import { EMPTY_PROFILE, ProfileForm, toProfileFormValues } from "@/components/content/profile-form";
import { PageHeader } from "@/components/shared/page-header";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

export default function EditProfilePage() {
  const id = useParams().id as string;
  const { isOwner } = useContentUser();
  const { data, isLoading } = useQuery("getContentProfileById", [id]);
  const { mutate, isLoading: isSaving, error } = useMutate("updateProfile", {
    invalidateKeys: ["getContentProfileById", "getContentProfiles", "getContentOverview"],
  });
  const defaultValues = useMemo(() => (data ? toProfileFormValues(data) : EMPTY_PROFILE), [data]);

  if (isLoading && !data) return <EditorSkeleton />;
  if (!data) return <NotFoundState label="profile" backHref="/content/profiles" />;

  // A profile that is on the website is live content, so only an owner changes it.
  const canEdit = isOwner || !data.isVisible;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={data.name} subtitle={data.title} actions={<VisibilityBadge isVisible={data.isVisible} />} />
      {!canEdit && (
        <EditorNotice>
          This profile is shown on the website, so only a Content Owner can change it. You can still read it here.
        </EditorNotice>
      )}
      {isOwner && data.isVisible && (
        <EditorNotice>This profile is shown on the website. Changes you save appear there straight away.</EditorNotice>
      )}
      <Card>
        <ProfileForm
          defaultValues={defaultValues}
          onSubmit={(values) => mutate(id, values)}
          isSaving={isSaving}
          error={error}
          submitLabel="Save changes"
          disabled={!canEdit}
        />
      </Card>
    </div>
  );
}
