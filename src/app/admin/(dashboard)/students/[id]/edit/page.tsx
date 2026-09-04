"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";

import { studentCreateSchema, type StudentCreateInput } from "@/actions/students.schema";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/hooks/useRouter";

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: student, isLoading: isLoadingStudent } = useQuery("getStudentById", [id]);
  const { data: familiesData } = useQuery("getFamilies", [{ pageSize: 100 }]);

  const familyOptions = useMemo(
    () => familiesData?.data.map((f) => ({ label: f.familyName, value: f.id })) ?? [],
    [familiesData],
  );

  const { mutate, isLoading: isSaving } = useMutate("updateStudent", {
    invalidateKeys: ["getStudents", "getStudentById"],
    onSuccess: () => router.push(`/admin/students/${id}`),
  });

  if (isLoadingStudent) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-muted-foreground">Student not found.</p>
        <Button asChild variant="outline">
          <Link href="/admin/students">Back to Students</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit Student" subtitle={`Editing ${student.fullName}`} />
      <Card
        className="max-w-2xl"
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Student Details</span>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/students/${id}`}>Cancel</Link>
            </Button>
          </div>
        }
        headerClassName="border-b"
      >
        <FORM
          schema={studentCreateSchema}
          defaultValues={{
            fullName: student.fullName,
            familyId: student.familyId,
            dob: student.dob ? new Date(student.dob).toISOString().split("T")[0] : "",
            gender: student.gender ?? undefined,
            medicalNotes: student.medicalNotes ?? "",
            generalNotes: student.generalNotes ?? "",
            emergencyContactName: student.emergencyContactName ?? "",
            emergencyContactRelationship: student.emergencyContactRelationship ?? "",
            emergencyPhone: student.emergencyPhone ?? "",
          }}
          onSubmit={async (data: StudentCreateInput) => {
            await mutate(id, data);
          }}
        >
          {(form) => (
            <div className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds name="fullName" label="Student Name" placeholder="e.g. Nia Sharma" />
                <FormFeilds
                  name="familyId"
                  label="Family"
                  type="select"
                  options={familyOptions}
                  placeholder="Select family..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds name="dob" label="Date of Birth" type="date" />
                <FormFeilds
                  name="gender"
                  label="Gender"
                  type="select"
                  options={[
                    { label: "Male", value: "MALE" },
                    { label: "Female", value: "FEMALE" },
                    { label: "Other", value: "OTHER" },
                    { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" },
                  ]}
                  placeholder="Select..."
                />
              </div>
              <FormFeilds name="medicalNotes" label="Medical/Allergy Notes" type="textarea" placeholder="Any medical or allergy information..." />
              <FormFeilds name="generalNotes" label="General Notes" type="textarea" placeholder="Any additional notes..." />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds name="emergencyContactName" label="Emergency Contact Name" placeholder="e.g. Priya Sharma" />
                <FormFeilds name="emergencyContactRelationship" label="Relationship" placeholder="e.g. Grandmother" />
              </div>
              <FormFeilds name="emergencyPhone" label="Emergency Phone" placeholder="e.g. (555) 123-4567" />
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" type="button" asChild>
                  <Link href={`/admin/students/${id}`}>Cancel</Link>
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
