"use client";

import { useParams } from "next/navigation";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Modal } from "@/components/common/modal";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/hooks/useRouter";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: cls, isLoading } = useQuery("getClassById", [id]);
  const { mutate: toggleActive } = useMutate("toggleClassActive", {
    invalidateKeys: ["getClasses", "getClassById"],
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
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
      <PageHeader
        title={cls.name}
        subtitle={cls.danceStyle}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/classes/${id}/roster`}>Roster</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/classes/${id}/edit`}>Edit</Link>
            </Button>
            <Modal
              trigger={
                <Button variant={cls.isActive ? "destructive" : "default"}>
                  {cls.isActive ? "Deactivate" : "Activate"}
                </Button>
              }
              className="max-w-sm"
            >
              {({ close }) => (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">
                      {cls.isActive ? "Deactivate Class?" : "Activate Class?"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {cls.isActive
                        ? "This class will be hidden from enrollment options and billing."
                        : "This class will reappear in enrollment options and billing."}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={close}>Cancel</Button>
                    <Button
                      variant={cls.isActive ? "destructive" : "default"}
                      onClick={async () => {
                        await toggleActive(id, !cls.isActive);
                        close();
                      }}
                    >
                      {cls.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              )}
            </Modal>
          </div>
        }
      />

      <Card
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Class Details</span>
            <Badge variant={cls.isActive ? "default" : "secondary"}>
              {cls.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        }
        headerClassName="border-b"
      >
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Level</p>
            <p className="font-medium">{cls.level ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Teacher</p>
            <p className="font-medium">{cls.teacher ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Schedule</p>
            <p className="font-medium">
              {cls.dayOfWeek?.replace("_", " ") ?? "—"}
              {cls.startTime && ` at ${cls.startTime}`}
              {cls.endTime && ` – ${cls.endTime}`}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-medium">{cls.durationMins ? `${cls.durationMins} minutes` : "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Standard Rate</p>
            <p className="font-medium">
              {formatCurrency(Number(cls.standardRate))}
              {cls.pricingType === "SEASONAL" && (
                <span className="text-muted-foreground text-xs ml-1">(flat fee)</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Discount Eligible</p>
            <p className="font-medium">{cls.discountEligible ? "Yes" : "No"}</p>
          </div>
        </div>
      </Card>

      <Card
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Currently Enrolled ({cls.enrollments.length})
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/enrollments?classId=${id}`}>Manage</Link>
            </Button>
          </div>
        }
        headerClassName="border-b"
      >
        {cls.enrollments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">No students enrolled.</p>
          </div>
        ) : (
          <div className="divide-y">
            {cls.enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/admin/students/${enrollment.studentId}`)}
              >
                <div>
                  <p className="font-medium">{enrollment.student.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {enrollment.student.family.familyName} family
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Since {new Date(enrollment.startDate).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {cls.monthlyFees.length > 0 && (
        <Card
          header={<span className="text-sm font-medium">Recent Monthly Fees</span>}
          headerClassName="border-b"
        >
          <div className="divide-y">
            {cls.monthlyFees.map((fee) => (
              <div key={fee.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">
                    {new Date(fee.month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {fee.billableSessions
                      ? `${fee.billableSessions} sessions × ${formatCurrency(Number(fee.rate))}`
                      : "Flat fee"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{formatCurrency(Number(fee.monthlyClassFee))}</p>
                  {fee.isOverridden && <Badge variant="secondary">Overridden</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
