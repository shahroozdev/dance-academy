"use client";

import { Card } from "@/components/common/card";
import { EMPTY_PERFORMANCE, PerformanceForm } from "@/components/content/performance-form";
import { PageHeader } from "@/components/shared/page-header";
import { useMutate } from "@/hooks/useMutate";
import { useRouter } from "@/hooks/useRouter";

export default function NewPerformancePage() {
  const router = useRouter();
  const { mutate, isLoading, error } = useMutate("createPerformance", {
    invalidateKeys: ["getContentPerformances", "getContentOverview"],
    onSuccess: (created) => router.push(`/content/performances/${created.id}`),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add a performance" subtitle="It is saved as a draft. Nothing appears on the website until a Content Owner publishes it." />
      <Card>
        <PerformanceForm
          defaultValues={EMPTY_PERFORMANCE}
          onSubmit={mutate}
          isSaving={isLoading}
          error={error}
          submitLabel="Save draft"
        />
      </Card>
    </div>
  );
}
