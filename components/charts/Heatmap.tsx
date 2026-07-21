"use client";

import React, { useState } from "react";
import { GREEN_RAMP } from "@/lib/theme";
import { TipShell } from "./ChartTooltip";

// Sequential single-hue heatmap (magnitude). Lightest = near zero.
export function Heatmap({
  rows, // y labels
  cols, // x labels
  matrix, // matrix[y][x] = value
  format,
  cellLabel,
}: {
  rows: string[];
  cols: string[];
  matrix: number[][];
  format: (v: number) => string;
  cellLabel?: (v: number) => string;
}) {
  const [hover, setHover] = useState<{ r: number; c: number; x: number; y: number } | null>(null);
  const max = Math.max(1, ...matrix.flat());

  const colorFor = (v: number) => {
    if (v <= 0) return "var(--surface-2)";
    const t = Math.sqrt(v / max); // perceptual boost for low values
    const idx = Math.min(GREEN_RAMP.length - 1, Math.floor(t * (GREEN_RAMP.length - 1)));
    return GREEN_RAMP[idx];
  };
  const inkFor = (v: number) => (Math.sqrt(v / max) > 0.62 ? "#f3f1e7" : "var(--text-secondary)");

  return (
    <div className="relative">
      <div className="overflow-x-auto no-scrollbar">
        <div
          className="grid gap-1 min-w-[420px]"
          style={{ gridTemplateColumns: `72px repeat(${cols.length}, minmax(0,1fr))` }}
        >
          <div />
          {cols.map((c) => (
            <div key={c} className="pb-1 text-center text-[11px] font-medium text-[var(--text-muted)]">
              {c}
            </div>
          ))}
          {rows.map((r, ri) => (
            <React.Fragment key={r}>
              <div className="flex items-center pr-2 text-[11.5px] font-medium text-[var(--text-secondary)]">
                {r}
              </div>
              {cols.map((c, ci) => {
                const v = matrix[ri]?.[ci] ?? 0;
                return (
                  <div
                    key={c}
                    onMouseEnter={(e) =>
                      setHover({ r: ri, c: ci, x: e.clientX, y: e.clientY })
                    }
                    onMouseMove={(e) => setHover({ r: ri, c: ci, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setHover(null)}
                    className="flex h-11 items-center justify-center rounded-md text-[11.5px] font-semibold tnum transition-transform hover:scale-[1.04]"
                    style={{ background: colorFor(v), color: inkFor(v) }}
                  >
                    {v > 0 ? (cellLabel ? cellLabel(v) : "") : ""}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      {hover && (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <TipShell
            title={`${rows[hover.r]} · ${cols[hover.c]}`}
            rows={[{ label: "Valor", value: format(matrix[hover.r]?.[hover.c] ?? 0) }]}
          />
        </div>
      )}
    </div>
  );
}
