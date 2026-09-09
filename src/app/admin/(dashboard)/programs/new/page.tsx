"use client";

import { programCreateSchema, type ProgramCreateInput } from "@/actions/programs.schema";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { useMutate } from "@/hooks/useMutate";
import { useRouter } from "@/hooks/useRouter";

export default function NewProgramPage() {
  const router = useRouter();
  const { mutate, isLoading, error } = useMutate("createProgram", {
    invalidateKeys: ["getPrograms", "getActivePrograms"],
    onSuccess: (program) => router.push(`/admin/programs/${program.id}`),
  });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add Dance Program" subtitle="Create a parent program before adding its levels and batches." />
      <Card className="max-w-2xl" header={<span className="text-sm font-medium">Program Details</span>} headerClassName="border-b">
        <FORM schema={programCreateSchema} defaultValues={{ name: "", description: "", isActive: true }} onSubmit={async (data: ProgramCreateInput) => { await mutate(data); }}>
          {(form) => <div className="space-y-4 p-4">
            <FormFeilds name="name" label="Program Name" placeholder="e.g. Bollywood" required />
            <FormFeilds name="description" label="Description" type="textarea" placeholder="Optional information about this program" />
            {Boolean(error) && <p role="alert" className="text-sm text-destructive">{error instanceof Error ? error.message : "Could not create the program."}</p>}
            <div className="flex justify-end gap-2"><Button variant="outline" type="button" asChild><Link href="/admin/programs">Cancel</Link></Button><Button type="submit" disabled={isLoading || !form.formState.isValid}>{isLoading ? "Creating..." : "Create Program"}</Button></div>
          </div>}
        </FORM>
      </Card>
    </div>
  );
}
