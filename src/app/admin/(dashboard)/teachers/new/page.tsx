"use client";

import { teacherCreateSchema, type TeacherCreateInput } from "@/actions/teachers.schema";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { useMutate } from "@/hooks/useMutate";
import { useRouter } from "@/hooks/useRouter";

export default function NewTeacherPage() {
  const router = useRouter();
  const { mutate, isLoading } = useMutate("createTeacher", {
    invalidateKeys: ["getTeachers"],
    onSuccess: (teacher) => router.push(`/admin/teachers/${teacher.id}`),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add Teacher" subtitle="Add a new instructor." />
      <Card
        className="max-w-2xl"
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Teacher Details</span>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/teachers">Cancel</Link>
            </Button>
          </div>
        }
        headerClassName="border-b"
      >
        <FORM
          schema={teacherCreateSchema}
          defaultValues={{
            name: "",
            email: "",
            phone: "",
            notes: "",
            isActive: true,
          }}
          onSubmit={async (data: TeacherCreateInput) => {
            await mutate(data);
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
                  <Link href="/admin/teachers">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isLoading || !form.formState.isValid}>
                  {isLoading ? "Creating..." : "Add Teacher"}
                </Button>
              </div>
            </div>
          )}
        </FORM>
      </Card>
    </div>
  );
}
