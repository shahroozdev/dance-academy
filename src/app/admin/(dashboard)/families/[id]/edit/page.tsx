"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { familyCreateSchema, type FamilyCreateInput } from "@/actions/families.schema";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

export default function EditFamilyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: family, isLoading } = useQuery("getFamilyById", [id]);
  const { mutate, isLoading: isSaving } = useMutate("updateFamily", {
    invalidateKeys: ["getFamilies", "getFamilyById"],
    onSuccess: () => router.push(`/admin/families/${id}`),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-muted-foreground">Family not found.</p>
        <Button asChild variant="outline">
          <Link href="/admin/families">Back to Families</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit Family" subtitle={`Editing ${family.familyName}`} />
      <Card
        className="max-w-2xl"
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Family Details</span>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/families/${id}`}>Cancel</Link>
            </Button>
          </div>
        }
        headerClassName="border-b"
      >
        <FORM
          schema={familyCreateSchema}
          defaultValues={{
            familyName: family.familyName,
            parentGuardianName: family.parentGuardianName,
            email: family.email ?? "",
            phone: family.phone,
            notes: family.notes ?? "",
          }}
          onSubmit={async (data: FamilyCreateInput) => {
            await mutate(id, data);
          }}
        >
          {(form) => (
            <div className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds name="familyName" label="Family Name" placeholder="e.g. Sharma" />
                <FormFeilds name="parentGuardianName" label="Parent/Guardian Name" placeholder="e.g. Priya Sharma" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds name="phone" label="Phone" type="tel" placeholder="+1 (555) 123-4567" />
                <FormFeilds name="email" label="Email" type="email" placeholder="priya@example.com" />
              </div>
              <FormFeilds name="notes" label="Notes" type="textarea" placeholder="Any additional notes..." />
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" type="button" asChild>
                  <Link href={`/admin/families/${id}`}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSaving || !form.formState.isValid}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </FORM>
      </Card>
    </div>
  );
}
