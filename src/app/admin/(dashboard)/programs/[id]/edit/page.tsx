"use client";

import { useParams } from "next/navigation";

import { programCreateSchema, type ProgramCreateInput } from "@/actions/programs.schema";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { Skeleton } from "@/components/common/skeleton";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/hooks/useRouter";

export default function EditProgramPage() {
  const id = useParams().id as string;
  const router = useRouter();
  const { data: program, isLoading } = useQuery("getProgramById", [id]);
  const { mutate, isLoading: isSaving, error } = useMutate("updateProgram", {
    invalidateKeys: ["getPrograms", "getProgramById", "getActivePrograms", "getClasses"],
    onSuccess: () => router.push(`/admin/programs/${id}`),
  });
  if (isLoading) return <div className="space-y-6"><Skeleton className="h-16 w-full" /><Skeleton className="h-48 w-full" /></div>;
  if (!program) return <div className="py-16 text-center text-muted-foreground">Program not found.</div>;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit Dance Program" subtitle={`Editing ${program.name}`} />
      <Card className="max-w-2xl" header={<span className="text-sm font-medium">Program Details</span>} headerClassName="border-b">
        <FORM schema={programCreateSchema} defaultValues={{ name: program.name, description: program.description ?? "", isActive: program.isActive }} onSubmit={async (data: ProgramCreateInput) => { await mutate(id, data); }}>
          {(form) => <div className="space-y-4 p-4">
            <FormFeilds name="name" label="Program Name" required />
            <FormFeilds name="description" label="Description" type="textarea" />
            {Boolean(error) && <p role="alert" className="text-sm text-destructive">{error instanceof Error ? error.message : "Could not save the program."}</p>}
            <div className="flex justify-end gap-2"><Button variant="outline" type="button" asChild><Link href={`/admin/programs/${id}`}>Cancel</Link></Button><Button type="submit" disabled={isSaving || !form.formState.isValid}>{isSaving ? "Saving..." : "Save Changes"}</Button></div>
          </div>}
        </FORM>
      </Card>
    </div>
  );
}
