"use client";

import { Card } from "@/components/common/card";
import { EMPTY_PROFILE, ProfileForm } from "@/components/content/profile-form";
import { PageHeader } from "@/components/shared/page-header";
import { useMutate } from "@/hooks/useMutate";
import { useRouter } from "@/hooks/useRouter";

export default function NewProfilePage() {
  const router = useRouter();
  const { mutate, isLoading, error } = useMutate("createProfile", {
    invalidateKeys: ["getContentProfiles", "getContentOverview"],
    onSuccess: (created) => router.push(`/content/profiles/${created.id}`),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add a profile" subtitle="It stays hidden from the website until its website switch is turned on." />
      <Card>
        <ProfileForm
          defaultValues={EMPTY_PROFILE}
          onSubmit={mutate}
          isSaving={isLoading}
          error={error}
          submitLabel="Save profile"
        />
      </Card>
    </div>
  );
}
