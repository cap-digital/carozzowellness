"use client";

import React from "react";
import { int, pct } from "@/lib/format";

export interface FunnelStage {
  label: string;
  value: number;
  color: string;
  hint?: string;
}

// Centered funnel. By default the bars taper in fixed, even steps (nice funnel
// shape) instead of scaling to the values — the huge impressions→clicks drop
// makes a value-proportional funnel look broken. Real values + stage-to-stage
// conversion rates are still shown as labels.
export function Funnel({
  stages,
  proportional = false,
}: {
  stages: FunnelStage[];
  proportional?: boolean;
}) {
  const top = stages[0]?.value || 1;
  const n = stages.length;

  const widthFor = (i: number, value: number) => {
    if (proportional) return Math.max((value / top) * 100, 3);
    // even taper from 100% down to ~42%
    return 100 - (i * (58 / Math.max(n - 1, 1)));
  };

  return (
    <div className="flex flex-col gap-2.5">
      {stages.map((s, i) => {
        const w = widthFor(i, s.value);
        const stepRate = i === 0 ? 100 : (s.value / (stages[i - 1].value || 1)) * 100;
        return (
          <div key={s.label} className="group">
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
                {s.label}
              </span>
              {s.hint && <span className="tnum text-[var(--text-muted)]">{s.hint}</span>}
            </div>
            <div className="relative flex h-10 items-center justify-center">
              <div
                className="flex h-full items-center justify-center rounded-lg transition-all duration-500 ease-out"
                style={{
                  width: `${w}%`,
                  background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)`,
                }}
              >
                <span className="text-[12px] font-semibold tnum text-white/95">{int(s.value)}</span>
              </div>
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
