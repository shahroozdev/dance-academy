"use client";

import { Card } from "@/components/common/card";
import { EMPTY_PRESS_ITEM, PressItemForm } from "@/components/content/press-item-form";
import { PageHeader } from "@/components/shared/page-header";
import { useMutate } from "@/hooks/useMutate";
import { useRouter } from "@/hooks/useRouter";

export default function NewPressItemPage() {
  const router = useRouter();
  const { mutate, isLoading, error } = useMutate("createPressItem", {
    invalidateKeys: ["getContentPressItems", "getContentOverview"],
    onSuccess: (created) => router.push(`/content/press/${created.id}`),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add a press item" subtitle="It is saved as a draft. Nothing appears on the website until a Content Owner publishes it." />
      <Card>
        <PressItemForm
          defaultValues={EMPTY_PRESS_ITEM}
          onSubmit={mutate}
          isSaving={isLoading}
          error={error}
          submitLabel="Save draft"
        />
      </Card>
    </div>
  );
}
