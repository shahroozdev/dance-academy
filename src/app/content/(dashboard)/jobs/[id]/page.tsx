"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";

import { useContentUser } from "@/components/content/content-user-context";
import { EditorFrame } from "@/components/content/editor-frame";
import { EditorSkeleton, NotFoundState } from "@/components/content/editor-parts";
import { JobDeleteButton } from "@/components/content/job-delete-button";
import { EMPTY_JOB_OPENING, JobOpeningForm, toJobOpeningFormValues } from "@/components/content/job-opening-form";
import type { QueryKey } from "@/hooks/query-registry";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { canRevise } from "@/lib/content-publishing";

const INVALIDATE_KEYS: QueryKey[] = ["getContentJobOpeningById", "getContentJobOpenings", "getContentOverview"];

export default function EditJobOpeningPage() {
  const id = useParams().id as string;
  const { role } = useContentUser();
  const { data, isLoading } = useQuery("getContentJobOpeningById", [id]);
  const { mutate, isLoading: isSaving, error } = useMutate("updateJobOpening", { invalidateKeys: INVALIDATE_KEYS });
  const defaultValues = useMemo(() => (data ? toJobOpeningFormValues(data) : EMPTY_JOB_OPENING), [data]);

  if (isLoading && !data) return <EditorSkeleton />;
  if (!data) return <NotFoundState label="job opening" backHref="/content/jobs" />;

  return (
    <EditorFrame
      title={data.title}
      entity="job"
      id={id}
      status={data.status}
      invalidateKeys={INVALIDATE_KEYS}
      publishedAt={data.publishedAt}
      publishedByName={data.publishedByName}
      actions={<JobDeleteButton id={id} title={data.title} />}
    >
      <JobOpeningForm
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
