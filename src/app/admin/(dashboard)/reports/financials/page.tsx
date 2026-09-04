"use client";

import { TrendingUp } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/useQuery";

const CATEGORY_LABELS: Record<string, string> = {
  REGISTRATION_FEE: "Registration Fee",
  WORKSHOP_CAMP: "Workshop/Camp",
  PERFORMANCE_FEE: "Performance Fee",
  COSTUME_INCOME: "Costume Income",
  PRIVATE_LESSON: "Private Lesson",
  MISCELLANEOUS: "Miscellaneous",
  INSTRUCTOR_CHOREOGRAPHER: "Instructor/Choreographer",
  COMPETITION_EVENT_FEES: "Competition/Event Fees",
  ADVERTISING: "Advertising",
  SOFTWARE_SUBSCRIPTIONS: "Software/Subscriptions",
  MUSIC_EDITING: "Music/Editing",
  SUPPLIES: "Supplies",
  TRAVEL: "Travel",
};

const PERIOD_TABS = [
  { label: "Monthly", value: "MONTH" },
  { label: "Yearly", value: "YEAR" },
  { label: "All-Time", value: "ALL_TIME" },
] as const;
type PeriodType = (typeof PERIOD_TABS)[number]["value"];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const VALID_PERIOD_TYPES = PERIOD_TABS.map((t) => t.value) as readonly string[];

export default function FinancialReportsPage() {
  const searchParams = useSearchParams();
  const periodParam = searchParams.get("period");
  const initialPeriodType: PeriodType = VALID_PERIOD_TYPES.includes(periodParam ?? "")
    ? (periodParam as PeriodType)
    : "MONTH";
  const initialYear = Number(searchParams.get("year")) || new Date().getFullYear();

  const [periodType, setPeriodType] = useState<PeriodType>(initialPeriodType);
  const [month, setMonth] = useState(currentMonthValue());
  const [year, setYear] = useState(initialYear);

  const { data: years } = useQuery("getAvailableYears", []);

  const period = useMemo(() => {
    if (periodType === "MONTH") return { type: "MONTH" as const, month };
    if (periodType === "YEAR") return { type: "YEAR" as const, year };
    return { type: "ALL_TIME" as const };
  }, [periodType, month, year]);

  const { data: summary, isLoading } = useQuery("getFinancialSummary", [period]);
  const { data: trend } = useQuery("getMonthlyTrend", [year], { enabled: periodType === "YEAR" });

  const maxTrendValue = trend ? Math.max(1, ...trend.flatMap((p) => [p.income, p.expenses])) : 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Financial Report" subtitle="Income, expenses, and net profit for the studio." />
      <Card
        header={
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">Period</span>
          </div>
        }
        headerClassName="border-b"
      >
        <div className="flex flex-wrap items-center gap-2 p-4">
          {PERIOD_TABS.map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant={periodType === tab.value ? "default" : "outline"}
              onClick={() => setPeriodType(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
          {periodType === "MONTH" && (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
          {periodType === "YEAR" && (
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {(years ?? [year]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>
      </Card>

      {isLoading || !summary ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card header={<span className="text-sm font-medium">Summary</span>} headerClassName="border-b">
            <div className="space-y-1 p-4 text-sm">
              <Row label="Tuition/Payments Collected" value={formatCurrency(summary.tuitionCollected)} />
              <CategoryGroup label="Other Income" total={summary.otherIncome} rows={summary.otherIncomeByCategory} />
              <div className="border-t pt-1">
                <Row label="TOTAL INCOME" value={formatCurrency(summary.totalIncome)} emphasized />
              </div>

              <div className="pt-4">
                <Row label="Rent" value={formatCurrency(summary.rent)} />
                <Row label="Costumes/Props" value={formatCurrency(summary.costumesProps)} />
                <CategoryGroup label="Other Expenses" total={summary.otherExpenses} rows={summary.otherExpensesByCategory} />
                <div className="border-t pt-1">
                  <Row label="TOTAL EXPENSES" value={formatCurrency(summary.totalExpenses)} emphasized />
                </div>
              </div>

              <div className="border-t pt-2">
                <Row
                  label="NET PROFIT"
                  value={formatCurrency(summary.netProfit)}
                  emphasized
                  positive={summary.netProfit >= 0}
                />
              </div>
            </div>
          </Card>

          {periodType === "YEAR" && trend && (
            <Card header={<span className="text-sm font-medium">Income vs. Expenses by Month</span>} headerClassName="border-b">
              <div className="flex items-end gap-2 p-4" style={{ height: 220 }}>
                {trend.map((point) => (
                  <div key={point.month} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-40 w-full items-end justify-center gap-0.5">
                      <div
                        className="w-2/5 rounded-t bg-primary"
                        style={{ height: `${(point.income / maxTrendValue) * 100}%` }}
                        title={`Income: ${formatCurrency(point.income)}`}
                      />
                      <div
                        className="w-2/5 rounded-t bg-destructive/60"
                        style={{ height: `${(point.expenses / maxTrendValue) * 100}%` }}
                        title={`Expenses: ${formatCurrency(point.expenses)}`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{point.month.split("-")[1]}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 border-t p-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-primary" /> Income
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-destructive/60" /> Expenses
                </span>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  emphasized,
  positive,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={emphasized ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
      <span
        className={
          emphasized
            ? `text-lg font-semibold ${positive === false ? "text-destructive" : positive === true ? "text-primary" : ""}`
            : undefined
        }
      >
        {value}
      </span>
    </div>
  );
}

function CategoryGroup({ label, total, rows }: { label: string; total: number; rows: { category: string; amount: number }[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        disabled={rows.length === 0}
        className="flex w-full items-center justify-between text-left disabled:cursor-default"
      >
        <span className="text-muted-foreground">
          {label} {rows.length > 0 && <span className="text-xs">({expanded ? "hide" : "show"} breakdown)</span>}
        </span>
        <span>{formatCurrency(total)}</span>
      </button>
      {expanded && (
        <div className="ml-4 mt-1 space-y-1 border-l pl-3">
          {rows.map((r) => (
            <div key={r.category} className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{CATEGORY_LABELS[r.category] ?? r.category}</span>
              <span>{formatCurrency(r.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
