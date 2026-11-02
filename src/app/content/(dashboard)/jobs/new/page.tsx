"use client";

import { Card } from "@/components/common/card";
import { EMPTY_JOB_OPENING, JobOpeningForm } from "@/components/content/job-opening-form";
import { PageHeader } from "@/components/shared/page-header";
import { useMutate } from "@/hooks/useMutate";
import { useRouter } from "@/hooks/useRouter";

export default function NewJobOpeningPage() {
  const router = useRouter();
  const { mutate, isLoading, error } = useMutate("createJobOpening", {
    invalidateKeys: ["getContentJobOpenings", "getContentOverview"],
    onSuccess: (created) => router.push(`/content/jobs/${created.id}`),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add a job opening" subtitle="It is saved as a draft. Nothing appears on the website until a Content Owner publishes it." />
      <Card>
        <JobOpeningForm
          defaultValues={EMPTY_JOB_OPENING}
          onSubmit={mutate}
          isSaving={isLoading}
          error={error}
          submitLabel="Save draft"
        />
      </Card>
    </div>
  );
}
