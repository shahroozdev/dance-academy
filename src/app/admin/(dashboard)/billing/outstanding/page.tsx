import { HandCoins } from "lucide-react";

import { getOutstandingFees } from "@/actions/outstanding-fees";
import { Button } from "@/components/common/button";
import { Card, CardTitle } from "@/components/common/card";
import { FilterToggleRowServer } from "@/components/common/filter-toggle-row-server";
import { PaginationServer } from "@/components/common/pagination-server";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { DEFAULT_PAGE_SIZE, parsePageParams } from "@/lib/pagination";

import { OutstandingFeesTable } from "./outstanding-fees-table";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default async function OutstandingFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const query = { classId: params.classId || undefined, ...parsePageParams(params) };
  const data = await getOutstandingFees(query);

  const className = data.classOptions.find((option) => option.id === data.classId)?.name;
  const studentLabel = `${data.studentCount} ${data.studentCount === 1 ? "student" : "students"}`;
  const summary = className
    ? `${studentLabel} still owe for ${className}: ${formatCurrency(data.amountDue)}`
    : `${studentLabel} have fees still due: ${formatCurrency(data.amountDue)}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Outstanding Fees"
        subtitle="Everyone who still owes money, across all months. Payments recorded for a class go to that class first; other payments are shared across the bill's classes in proportion, so each class stays pending until the bill is paid and the class amounts add up to exactly what the bill still owes."
        actions={<Button variant="outline" asChild><Link href="/admin/billing">Back to Billing</Link></Button>}
      />
      <Card
        header={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HandCoins className="size-5 text-muted-foreground" />
              <CardTitle className="text-sm">{summary}</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">{data.total} {data.total === 1 ? "bill" : "bills"}</span>
          </div>
        }
        headerClassName="border-b"
        contentClassName="flex min-h-0 flex-1 flex-col p-2"
        // Also shown on a single page when a non-default page size is chosen, so it can be changed back.
        footer={data.pages > 1 || query.pageSize !== DEFAULT_PAGE_SIZE
          ? <PaginationServer pages={data.pages} total={data.total} itemLabel="bills" />
          : undefined}
        footerClassName="border-t p-0"
      >
        <FilterToggleRowServer
          filters={[{
            param: "classId",
            label: "Class",
            allLabel: "All classes",
            options: data.classOptions.map((option) => ({ label: option.name, value: option.id })),
          }]}
        />
        <OutstandingFeesTable key={JSON.stringify(query)} query={query} initialData={data} />
      </Card>
    </div>
  );
}
