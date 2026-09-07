"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { BillingStatusCount } from "@/actions/dashboard";

const STATUS_LABELS: Record<BillingStatusCount["status"], string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partial",
  PAID: "Paid",
  OVERPAID: "Overpaid",
};

// Mirrors the billing list page's status semantics: UNPAID=destructive, PAID=primary.
const STATUS_COLORS: Record<BillingStatusCount["status"], string> = {
  UNPAID: "var(--color-destructive)",
  PARTIAL: "var(--color-chart-1)",
  PAID: "var(--color-primary)",
  OVERPAID: "var(--color-chart-4)",
};

export function BillingStatusChart({ data }: { data: BillingStatusCount[] }) {
  const chartData = data.map((row) => ({ ...row, label: STATUS_LABELS[row.status] }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" width={28} />
        <Tooltip
          formatter={(value) => [Number(value), "Bills"]}
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
          <LabelList dataKey="count" position="top" fontSize={12} fill="var(--color-foreground)" />
          {chartData.map((row) => (
            <Cell key={row.status} fill={STATUS_COLORS[row.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
