"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { pct } from "@/lib/format";

export interface DonutDatum {
  name: string;
  value: number;
  color: string;
}

export function Donut({
  data,
  centerValue,
  centerLabel,
  format,
  height = 210,
  thickness = 26,
}: {
  data: DonutDatum[];
  centerValue?: string;
  centerLabel?: string;
  format: (v: number) => string;
  height?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const [active, setActive] = React.useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative mx-auto shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={height / 2 - thickness}
              outerRadius={height / 2 - 6}
              paddingAngle={2}
              stroke="var(--surface-1)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.name}
                  fill={d.color}
                  opacity={active === null || active === i ? 1 : 0.4}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[20px] font-semibold leading-none text-[var(--text-primary)]">
            {active !== null ? format(data[active].value) : centerValue}
          </span>
          <span className="mt-1 max-w-[80%] text-[11px] leading-tight text-[var(--text-muted)]">
            {active !== null ? data[active].name : centerLabel}
          </span>
        </div>
      </div>

      <ul className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li
            key={d.name}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-[12.5px] transition-colors hover:bg-[var(--surface-2)]"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: d.color }} />
            <span className="truncate text-[var(--text-secondary)]">{d.name}</span>
            <span className="ml-auto font-semibold tnum text-[var(--text-primary)]">
              {format(d.value)}
            </span>
            <span className="w-11 text-right tnum text-[11px] text-[var(--text-muted)]">
              {pct((d.value / total) * 100, 1)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
