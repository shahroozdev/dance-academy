import { getDashboardSummary } from "@/actions/dashboard";
import { Card, CardContent, CardTitle } from "@/components/common/card";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatMonthLabel(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function AdminDashboardPage() {
  const summary = await getDashboardSummary();
  const currentYear = new Date().getUTCFullYear();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" subtitle={`Studio overview for ${formatMonthLabel(summary.month)}.`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Current month tuition due" value={formatCurrency(summary.currentMonthTuitionDue)} />
        <StatCard label="Current month collected" value={formatCurrency(summary.currentMonthCollected)} />
        <StatCard label="Current month outstanding" value={formatCurrency(summary.currentMonthOutstanding)} />
        <StatCard label="Active students" value={String(summary.activeStudentCount)} />
        <StatCard
          label="Unpaid / Partial bills"
          value={String(summary.unpaidCount + summary.partialCount)}
          href="/admin/billing"
        />
      </div>

      <Card
        header={
          <>
            <CardTitle>Financial Report</CardTitle>
          </>
        }
        headerClassName="border-b"
      >
        <div className="flex flex-wrap gap-3 p-4">
          <Link
            href="/admin/reports/financials?period=MONTH"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted/50"
          >
            Monthly report
          </Link>
          <Link
            href={`/admin/reports/financials?period=YEAR&year=${currentYear}`}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted/50"
          >
            Yearly report ({currentYear})
          </Link>
          <Link
            href="/admin/reports/financials?period=ALL_TIME"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted/50"
          >
            All-time report
          </Link>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <Card header={<CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>}>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block transition-opacity hover:opacity-80">
      {content}
    </Link>
  ) : (
    content
  );
}
