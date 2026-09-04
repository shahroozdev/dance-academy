"use client";

import { Plus, TrendingUp } from "lucide-react";
import { useState } from "react";

import { OtherIncomeModal } from "@/app/admin/(dashboard)/income/other-income-modal";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { OtherIncomeCategory } from "@/generated/prisma/client";
import { useQuery } from "@/hooks/useQuery";


const CATEGORY_LABELS: Record<OtherIncomeCategory, string> = {
  REGISTRATION_FEE: "Registration Fee",
  WORKSHOP_CAMP: "Workshop/Camp",
  PERFORMANCE_FEE: "Performance Fee",
  COSTUME_INCOME: "Costume Income",
  PRIVATE_LESSON: "Private Lesson",
  MISCELLANEOUS: "Miscellaneous",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function OtherIncomePage() {
  const [category, setCategory] = useState<OtherIncomeCategory | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  const { data, isLoading } = useQuery("getOtherIncome", [
    {
      category: category === "ALL" ? undefined : category,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      pageSize: 100,
    },
  ]);

  const total = data?.data.reduce((sum, i) => sum + i.amount, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Other Income"
        subtitle="Track income outside of regular monthly tuition."
        actions={
          <Button onClick={() => setEditingId("new")}>
            <Plus className="size-4" />
            Add Income
          </Button>
        }
      />
      <Card
        header={
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">All Other Income</span>
            {data && <span className="ml-auto text-sm font-medium">Total: {formatCurrency(total)}</span>}
          </div>
        }
        headerClassName="border-b"
        contentClassName="flex min-h-0 flex-1 flex-col p-2"
      >
        <div className="flex flex-wrap items-center gap-2 p-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as OtherIncomeCategory | "ALL")}
            className="flex h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {isLoading && (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {!isLoading && !data?.data.length && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <TrendingUp className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No other income matches the current filters.</p>
          </div>
        )}
        {!isLoading && data && data.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((income) => (
                <TableRow key={income.id} className="cursor-pointer" onClick={() => setEditingId(income.id)}>
                  <TableCell>{new Date(income.date).toLocaleDateString()}</TableCell>
                  <TableCell>{CATEGORY_LABELS[income.category]}</TableCell>
                  <TableCell className="font-medium">{income.description}</TableCell>
                  <TableCell>{formatCurrency(income.amount)}</TableCell>
                  <TableCell>{income.paymentMethod}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditingId(income.id); }}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {editingId && <OtherIncomeModal id={editingId} onClose={() => setEditingId(null)} />}
    </div>
  );
}
