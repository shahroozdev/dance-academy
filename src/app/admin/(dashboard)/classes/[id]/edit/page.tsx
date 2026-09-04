"use client";

import { useParams } from "next/navigation";

import { classCreateSchema, type ClassCreateInput } from "@/actions/classes.schema";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/hooks/useRouter";

const DAY_OPTIONS = [
  { label: "Monday", value: "MONDAY" },
  { label: "Tuesday", value: "TUESDAY" },
  { label: "Wednesday", value: "WEDNESDAY" },
  { label: "Thursday", value: "THURSDAY" },
  { label: "Friday", value: "FRIDAY" },
  { label: "Saturday", value: "SATURDAY" },
  { label: "Sunday", value: "SUNDAY" },
];

const PRICING_OPTIONS = [
  { label: "Regular (per session)", value: "REGULAR" },
  { label: "Seasonal (flat fee)", value: "SEASONAL" },
];

export default function EditClassPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: cls, isLoading } = useQuery("getClassById", [id]);
  const { mutate, isLoading: isSaving } = useMutate("updateClass", {
    invalidateKeys: ["getClasses", "getClassById"],
    onSuccess: () => router.push(`/admin/classes/${id}`),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-muted-foreground">Class not found.</p>
        <Button asChild variant="outline">
          <Link href="/admin/classes">Back to Classes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit Class" subtitle={`Editing ${cls.name}`} />
      <Card
        className="max-w-2xl"
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Class Details</span>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/classes/${id}`}>Cancel</Link>
            </Button>
          </div>
        }
        headerClassName="border-b"
      >
        <FORM
          schema={classCreateSchema}
          defaultValues={{
            name: cls.name,
            danceStyle: cls.danceStyle,
            level: cls.level ?? "",
            teacher: cls.teacher ?? "",
            dayOfWeek: cls.dayOfWeek ?? undefined,
            startTime: cls.startTime ?? "",
            endTime: cls.endTime ?? "",
            durationMins: cls.durationMins ?? undefined,
            standardRate: Number(cls.standardRate),
            pricingType: cls.pricingType,
            discountEligible: cls.discountEligible,
            isActive: cls.isActive,
          }}
          onSubmit={async (data: ClassCreateInput) => {
            await mutate(id, data);
          }}
        >
          {(form) => (
            <div className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds name="name" label="Class Name" placeholder="e.g. Bharatanatyam Beginner" />
                <FormFeilds name="danceStyle" label="Dance Style" placeholder="e.g. Bharatanatyam" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds name="level" label="Level" placeholder="e.g. Beginner" />
                <FormFeilds name="teacher" label="Teacher" placeholder="e.g. Guru Smitha" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormFeilds name="dayOfWeek" label="Day" type="select" options={DAY_OPTIONS} placeholder="Select day..." />
                <FormFeilds name="startTime" label="Start Time" type="text" placeholder="e.g. 16:30" />
                <FormFeilds name="endTime" label="End Time" type="text" placeholder="e.g. 17:30" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormFeilds name="durationMins" label="Duration (mins)" type="number" />
                <FormFeilds name="standardRate" label="Standard Rate ($)" type="number" />
                <FormFeilds name="pricingType" label="Pricing Type" type="select" options={PRICING_OPTIONS} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" type="button" asChild>
                  <Link href={`/admin/classes/${id}`}>Cancel</Link>
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
