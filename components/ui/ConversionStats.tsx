import React from "react";
import { Card } from "@/components/ui/Card";
import { CONVERSION_METRICS, convCost, convRate } from "@/lib/metrics";
import type { Totals } from "@/lib/types";
import { brl, int, pct } from "@/lib/format";

// The three conversion actions shown INDIVIDUALLY — each with its own count,
// cost (custo) and rate (taxa). Never a combined "Conversões" total.
export function ConversionStats({ totals }: { totals: Totals }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CONVERSION_METRICS.map((m) => (
        <Card key={m.key} className="relative overflow-hidden p-4">
          <span className="absolute left-0 top-4 h-7 w-[3px] rounded-full" style={{ background: m.color }} />
          <div className="flex items-center gap-1.5 pl-2">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: m.color }} />
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">{m.label}</span>
          </div>
          <div className="mt-1.5 pl-2 text-[26px] font-semibold leading-none tnum text-[var(--text-primary)]">
            {int(totals[m.key])}
          </div>
          <div className="mt-3 flex items-center gap-5 pl-2">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Custo</div>
              <div className="mt-0.5 text-[13px] font-semibold tnum text-[var(--text-primary)]">
                {brl(convCost(totals, m.key))}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Taxa</div>
              <div className="mt-0.5 text-[13px] font-semibold tnum text-[var(--text-primary)]">
                {pct(convRate(totals, m.key))}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
