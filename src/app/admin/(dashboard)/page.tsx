import { Card, CardContent, CardDescription, CardTitle } from "@/components/common/card";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        subtitle="Studio overview will appear here as families, classes, and billing are set up."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          header={
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current month tuition due
            </CardTitle>
          }
        >
          <CardContent>
            <p className="text-2xl font-semibold">—</p>
          </CardContent>
        </Card>
        <Card
          header={
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current month collected
            </CardTitle>
          }
        >
          <CardContent>
            <p className="text-2xl font-semibold">—</p>
          </CardContent>
        </Card>
        <Card
          header={
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active students
            </CardTitle>
          }
        >
          <CardContent>
            <p className="text-2xl font-semibold">—</p>
          </CardContent>
        </Card>
      </div>
      <Card
        header={
          <>
            <CardTitle>Next steps</CardTitle>
            <CardDescription>
              Families, Students, Classes, and Billing modules are next — see docs/07-implementation-roadmap.md.
            </CardDescription>
          </>
        }
      />
    </div>
  );
}
