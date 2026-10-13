"use client";

import { Card } from "@/components/common/card";
import { EMPTY_FESTIVAL, FestivalForm } from "@/components/content/festival-form";
import { PageHeader } from "@/components/shared/page-header";
import { useMutate } from "@/hooks/useMutate";
import { useRouter } from "@/hooks/useRouter";

export default function NewFestivalPage() {
  const router = useRouter();
  const { mutate, isLoading, error } = useMutate("createFestival", {
    invalidateKeys: ["getContentFestivals", "getContentOverview"],
    onSuccess: (created) => router.push(`/content/festivals/${created.id}`),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add a festival edition" subtitle="It is saved as a draft. Nothing appears on the website until a Content Owner publishes it." />
      <Card>
        <FestivalForm
          defaultValues={EMPTY_FESTIVAL}
          onSubmit={mutate}
          isSaving={isLoading}
          error={error}
          submitLabel="Save draft"
        />
      </Card>
    </div>
  );
}
