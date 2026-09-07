"use client";

import { Cell, Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from "recharts";

import type { RegistrationFunnelStage } from "@/actions/dashboard";

const STAGE_COLORS = ["var(--color-chart-1)", "var(--color-chart-3)", "var(--color-primary)"];

export function RegistrationFunnelChart({ data }: { data: RegistrationFunnelStage[] }) {
  const funnelData = data.map((stage, index) => ({
    name: stage.stage,
    value: stage.count,
    label: `${stage.stage} · ${stage.count}`,
    fill: STAGE_COLORS[index % STAGE_COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <FunnelChart>
        <Tooltip
          formatter={(value) => [Number(value), "Requests"]}
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Funnel dataKey="value" data={funnelData} isAnimationActive>
          <LabelList position="right" dataKey="label" fill="var(--color-foreground)" stroke="none" fontSize={12} />
          {funnelData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}
