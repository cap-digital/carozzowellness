"use client";

import React, { useState } from "react";
import { TipShell } from "./ChartTooltip";

export interface PyramidRow {
  label: string;
  left: number;
  right: number;
}

// Diverging population pyramid — female left, male right, shared center axis.
export function Pyramid({
  rows,
  leftColor,
  rightColor,
  leftLabel,
  rightLabel,
  format,
}: {
  rows: PyramidRow[];
  leftColor: string;
  rightColor: string;
  leftLabel: string;
  rightLabel: string;
  format: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.left, r.right)));
  const [tip, setTip] = useState<{ text: string; value: string; color: string; x: number; y: number } | null>(null);

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between text-[12px] font-medium">
        <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: leftColor }} /> {leftLabel}
        </span>
        <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          {rightLabel} <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: rightColor }} />
        </span>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            {/* left bar */}
            <div className="flex flex-1 justify-end">
              <div
                onMouseMove={(e) => setTip({ text: `${leftLabel} · ${r.label}`, value: format(r.left), color: leftColor, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTip(null)}
                className="h-6 rounded-l-md transition-all duration-500"
                style={{ width: `${Math.max((r.left / max) * 100, 1.5)}%`, background: `linear-gradient(90deg, ${leftColor}bb, ${leftColor})` }}
              />
            </div>
            {/* age label */}
            <div className="w-12 shrink-0 text-center text-[11.5px] font-semibold tabular-nums text-[var(--text-secondary)]">
              {r.label}
            </div>
            {/* right bar */}
            <div className="flex flex-1 justify-start">
              <div
                onMouseMove={(e) => setTip({ text: `${rightLabel} · ${r.label}`, value: format(r.right), color: rightColor, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTip(null)}
                className="h-6 rounded-r-md transition-all duration-500"
                style={{ width: `${Math.max((r.right / max) * 100, 1.5)}%`, background: `linear-gradient(90deg, ${rightColor}, ${rightColor}bb)` }}
              />
            </div>
          </div>
        ))}
      </div>
      {tip && (
        <div className="pointer-events-none fixed z-50" style={{ left: tip.x + 12, top: tip.y + 12 }}>
          <TipShell title={tip.text} rows={[{ label: "Valor", value: tip.value, color: tip.color }]} />
        </div>
      )}
    </div>
  );
}
