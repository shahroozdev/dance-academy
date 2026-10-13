"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";

import { useContentUser } from "@/components/content/content-user-context";
import { EditorFrame } from "@/components/content/editor-frame";
import { EditorSkeleton, NotFoundState } from "@/components/content/editor-parts";
import { EMPTY_PERFORMANCE, PerformanceForm, toPerformanceFormValues } from "@/components/content/performance-form";
import type { QueryKey } from "@/hooks/query-registry";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { canRevise } from "@/lib/content-publishing";

const INVALIDATE_KEYS: QueryKey[] = ["getContentPerformanceById", "getContentPerformances", "getContentOverview"];

export default function EditPerformancePage() {
  const id = useParams().id as string;
  const { role } = useContentUser();
  const { data, isLoading } = useQuery("getContentPerformanceById", [id]);
  const { mutate, isLoading: isSaving, error } = useMutate("updatePerformance", { invalidateKeys: INVALIDATE_KEYS });
  const defaultValues = useMemo(() => (data ? toPerformanceFormValues(data) : EMPTY_PERFORMANCE), [data]);

  if (isLoading && !data) return <EditorSkeleton />;
  if (!data) return <NotFoundState label="performance" backHref="/content/performances" />;

  return (
    <EditorFrame
      title={data.title}
      entity="performance"
      id={id}
      status={data.status}
      invalidateKeys={INVALIDATE_KEYS}
      previewHref={`/content/performances/${id}/preview`}
      publishedAt={data.publishedAt}
      publishedByName={data.publishedByName}
    >
      <PerformanceForm
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
