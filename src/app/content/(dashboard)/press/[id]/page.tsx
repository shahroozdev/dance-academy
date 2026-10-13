"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";

import { useContentUser } from "@/components/content/content-user-context";
import { EditorFrame } from "@/components/content/editor-frame";
import { EditorSkeleton, NotFoundState } from "@/components/content/editor-parts";
import { EMPTY_PRESS_ITEM, PressItemForm, toPressItemFormValues } from "@/components/content/press-item-form";
import type { QueryKey } from "@/hooks/query-registry";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { canRevise } from "@/lib/content-publishing";

const INVALIDATE_KEYS: QueryKey[] = ["getContentPressItemById", "getContentPressItems", "getContentOverview"];

export default function EditPressItemPage() {
  const id = useParams().id as string;
  const { role } = useContentUser();
  const { data, isLoading } = useQuery("getContentPressItemById", [id]);
  const { mutate, isLoading: isSaving, error } = useMutate("updatePressItem", { invalidateKeys: INVALIDATE_KEYS });
  const defaultValues = useMemo(() => (data ? toPressItemFormValues(data) : EMPTY_PRESS_ITEM), [data]);

  if (isLoading && !data) return <EditorSkeleton />;
  if (!data) return <NotFoundState label="press item" backHref="/content/press" />;

  return (
    <EditorFrame
      title={data.title}
      entity="press"
      id={id}
      status={data.status}
      invalidateKeys={INVALIDATE_KEYS}
      publishedAt={data.publishedAt}
      publishedByName={data.publishedByName}
    >
      <PressItemForm
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
