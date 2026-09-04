"use client";

import { Plus, ReceiptText } from "lucide-react";
import { useState } from "react";

import { ExpenseModal } from "@/app/admin/(dashboard)/expenses/expense-modal";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExpenseCategory } from "@/generated/prisma/client";
import { useQuery } from "@/hooks/useQuery";


const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  STUDIO_RENT: "Studio Rent",
  INSTRUCTOR_CHOREOGRAPHER: "Instructor/Choreographer",
  COSTUMES: "Costumes",
  JEWELRY_PROPS: "Jewelry/Props",
  COMPETITION_EVENT_FEES: "Competition/Event Fees",
  ADVERTISING: "Advertising",
  SOFTWARE_SUBSCRIPTIONS: "Software/Subscriptions",
  MUSIC_EDITING: "Music/Editing",
  SUPPLIES: "Supplies",
  TRAVEL: "Travel",
  MISCELLANEOUS: "Miscellaneous",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function ExpensesPage() {
  const [category, setCategory] = useState<ExpenseCategory | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  const { data, isLoading } = useQuery("getExpenses", [
    {
      category: category === "ALL" ? undefined : category,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      pageSize: 100,
    },
  ]);

  const total = data?.data.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Expenses"
        subtitle="Log studio expenses by category, such as rent and costumes."
        actions={
          <Button onClick={() => setEditingId("new")}>
            <Plus className="size-4" />
            Add Expense
          </Button>
        }
      />
      <Card
        header={
          <div className="flex items-center gap-2">
            <ReceiptText className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">All Expenses</span>
            {data && <span className="ml-auto text-sm font-medium">Total: {formatCurrency(total)}</span>}
          </div>
        }
        headerClassName="border-b"
        contentClassName="flex min-h-0 flex-1 flex-col p-2"
      >
        <div className="flex flex-wrap items-center gap-2 p-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory | "ALL")}
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

        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ReceiptText className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No expenses match the current filters.</p>
          </div>
        ) : (
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
              {data.data.map((expense) => (
                <TableRow key={expense.id} className="cursor-pointer" onClick={() => setEditingId(expense.id)}>
                  <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                  <TableCell>{CATEGORY_LABELS[expense.category] ?? expense.category}</TableCell>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell>{formatCurrency(expense.amount)}</TableCell>
                  <TableCell>{expense.paymentMethod}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditingId(expense.id); }}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {editingId && <ExpenseModal id={editingId} onClose={() => setEditingId(null)} />}
    </div>
  );
}
