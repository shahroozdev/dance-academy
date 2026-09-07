"use client";

import { useParams } from "next/navigation";

import { teacherCreateSchema, type TeacherCreateInput } from "@/actions/teachers.schema";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/hooks/useRouter";

export default function EditTeacherPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: teacher, isLoading } = useQuery("getTeacherById", [id]);
  const { mutate, isLoading: isSaving } = useMutate("updateTeacher", {
    invalidateKeys: ["getTeachers", "getTeacherById"],
    onSuccess: () => router.push(`/admin/teachers/${id}`),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-muted-foreground">Teacher not found.</p>
        <Button asChild variant="outline">
          <Link href="/admin/teachers">Back to Teachers</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit Teacher" subtitle={`Editing ${teacher.name}`} />
      <Card
        className="max-w-2xl"
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Teacher Details</span>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/teachers/${id}`}>Cancel</Link>
            </Button>
          </div>
        }
        headerClassName="border-b"
      >
        <FORM
          schema={teacherCreateSchema}
          defaultValues={{
            name: teacher.name,
            email: teacher.email ?? "",
            phone: teacher.phone ?? "",
            notes: teacher.notes ?? "",
            isActive: teacher.isActive,
          }}
          onSubmit={async (data: TeacherCreateInput) => {
            await mutate(id, data);
          }}
        >
          {(form) => (
            <div className="space-y-4 p-4">
              <FormFeilds name="name" label="Full Name" placeholder="e.g. Meera Iyer" />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds name="email" label="Email" type="email" placeholder="meera@example.com" />
                <FormFeilds name="phone" label="Phone" type="tel" />
              </div>
              <FormFeilds name="notes" label="Notes" type="textarea" placeholder="Any additional notes..." />
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" type="button" asChild>
                  <Link href={`/admin/teachers/${id}`}>Cancel</Link>
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
