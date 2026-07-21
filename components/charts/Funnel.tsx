"use client";

import React from "react";
import { int, pct } from "@/lib/format";

export interface FunnelStage {
  label: string;
  value: number;
  color: string;
  hint?: string;
}

// Custom centered funnel with stage-to-stage conversion rates ("taxas").
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const top = stages[0]?.value || 1;
  return (
    <div className="flex flex-col gap-2">
      {stages.map((s, i) => {
        const wOfTop = Math.max((s.value / top) * 100, 3);
        const stepRate = i === 0 ? 100 : (s.value / (stages[i - 1].value || 1)) * 100;
        return (
          <div key={s.label} className="group">
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="tnum text-[var(--text-secondary)]">
                {int(s.value)}
                {s.hint && <span className="ml-1 text-[var(--text-muted)]">{s.hint}</span>}
              </span>
            </div>
            <div className="relative flex h-9 items-center justify-center">
              <div
                className="h-full rounded-lg transition-all duration-500 ease-out"
                style={{
                  width: `${wOfTop}%`,
                  background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)`,
                }}
              />
              {i > 0 && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold tnum text-[var(--text-secondary)]">
                  {pct(stepRate, 1)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
