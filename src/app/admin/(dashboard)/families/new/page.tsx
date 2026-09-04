"use client";

import { useRouter } from "next/navigation";

import { familyCreateSchema, type FamilyCreateInput } from "@/actions/families.schema";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { PageHeader } from "@/components/shared/page-header";
import { Link } from "@/components/Link";
import { useMutate } from "@/hooks/useMutate";

export default function NewFamilyPage() {
  const router = useRouter();
  const { mutate, isLoading } = useMutate("createFamily", {
    invalidateKeys: ["getFamilies"],
    onSuccess: (family) => router.push(`/admin/families/${family.id}`),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add Family" subtitle="Create a new family account." />
      <Card
        className="max-w-2xl"
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Family Details</span>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/families">Cancel</Link>
            </Button>
          </div>
        }
        headerClassName="border-b"
      >
        <FORM
          schema={familyCreateSchema}
          defaultValues={{
            familyName: "",
            parentGuardianName: "",
            email: "",
            phone: "",
            notes: "",
          }}
          onSubmit={async (data: FamilyCreateInput) => {
            await mutate(data);
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
                  <Link href="/admin/families">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isLoading || !form.formState.isValid}>
                  {isLoading ? "Creating..." : "Create Family"}
                </Button>
              </div>
            </div>
          )}
        </FORM>
      </Card>
    </div>
  );
}
