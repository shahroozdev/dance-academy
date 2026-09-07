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

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: teacher, isLoading } = useQuery("getTeacherById", [id]);
  const { mutate: toggleActive } = useMutate("toggleTeacherActive", {
    invalidateKeys: ["getTeachers", "getTeacherById"],
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
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
      <PageHeader
        title={teacher.name}
        subtitle={`${teacher.classes.length} class${teacher.classes.length === 1 ? "" : "es"}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/teachers/${id}/edit`}>Edit</Link>
            </Button>
            <Modal
              trigger={
                <Button variant={teacher.isActive ? "destructive" : "default"}>
                  {teacher.isActive ? "Deactivate" : "Activate"}
                </Button>
              }
              className="max-w-sm"
            >
              {({ close }) => (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">
                      {teacher.isActive ? "Deactivate Teacher?" : "Activate Teacher?"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {teacher.isActive
                        ? "This teacher will be hidden from the picker when adding or editing classes. Classes already assigned to them are unaffected."
                        : "This teacher will reappear in the picker when adding or editing classes."}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={close}>Cancel</Button>
                    <Button
                      variant={teacher.isActive ? "destructive" : "default"}
                      onClick={async () => {
                        await toggleActive(id, !teacher.isActive);
                        close();
                      }}
                    >
                      {teacher.isActive ? "Deactivate" : "Activate"}
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
            <span className="text-sm font-medium">Contact Information</span>
            <Badge variant={teacher.isActive ? "default" : "secondary"}>
              {teacher.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        }
        headerClassName="border-b"
      >
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{teacher.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{teacher.phone ?? "—"}</p>
          </div>
          {teacher.notes && (
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="font-medium">{teacher.notes}</p>
            </div>
          )}
        </div>
      </Card>

      <Card
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Classes Taught ({teacher.classes.length})</span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/classes/new">Add Class</Link>
            </Button>
          </div>
        }
        headerClassName="border-b"
      >
        {teacher.classes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">Not assigned to any classes yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {teacher.classes.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/admin/classes/${cls.id}`)}
              >
                <div>
                  <p className="font-medium">{cls.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {cls.danceStyle}
                    {cls.dayOfWeek && ` · ${cls.dayOfWeek.replace("_", " ")}`}
                    {cls.startTime && ` at ${cls.startTime}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {cls.enrollments.length} enrolled
                  </span>
                  <Badge variant={cls.isActive ? "default" : "secondary"}>
                    {cls.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Payments to This Teacher</span>
            <span className="text-sm font-medium">{formatCurrency(teacher.totalPaid)} total</span>
          </div>
        }
        headerClassName="border-b"
      >
        {teacher.expenses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">No expenses linked to this teacher yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {teacher.expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/admin/expenses`)}
              >
                <div>
                  <p className="font-medium">{expense.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(expense.date).toLocaleDateString()} · {expense.category.replace(/_/g, " ")}
                  </p>
                </div>
                <p className="font-medium">{formatCurrency(expense.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
