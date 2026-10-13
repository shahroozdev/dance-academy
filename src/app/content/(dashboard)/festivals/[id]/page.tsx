"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";

import { useContentUser } from "@/components/content/content-user-context";
import { EditorFrame } from "@/components/content/editor-frame";
import { EditorSkeleton, NotFoundState } from "@/components/content/editor-parts";
import { EMPTY_FESTIVAL, FestivalForm, toFestivalFormValues } from "@/components/content/festival-form";
import type { QueryKey } from "@/hooks/query-registry";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { canRevise } from "@/lib/content-publishing";

const INVALIDATE_KEYS: QueryKey[] = ["getContentFestivalById", "getContentFestivals", "getContentOverview"];

export default function EditFestivalPage() {
  const id = useParams().id as string;
  const { role } = useContentUser();
  const { data, isLoading } = useQuery("getContentFestivalById", [id]);
  const { mutate, isLoading: isSaving, error } = useMutate("updateFestival", { invalidateKeys: INVALIDATE_KEYS });
  const defaultValues = useMemo(() => (data ? toFestivalFormValues(data) : EMPTY_FESTIVAL), [data]);

  if (isLoading && !data) return <EditorSkeleton />;
  if (!data) return <NotFoundState label="festival" backHref="/content/festivals" />;

  return (
    <EditorFrame
      title={`Ananta ${data.year}`}
      entity="festival"
      id={id}
      status={data.status}
      invalidateKeys={INVALIDATE_KEYS}
      previewHref={`/content/festivals/${id}/preview`}
      publishedAt={data.publishedAt}
      publishedByName={data.publishedByName}
    >
      <FestivalForm
        defaultValues={defaultValues}
        onSubmit={(values) => mutate(id, values)}
        isSaving={isSaving}
        error={error}
        submitLabel={data.status === "PUBLISHED" ? "Save and return to draft" : "Save changes"}
        disabled={!canRevise(role, data.status)}
      />
    </EditorFrame>
  );
}
