import React from "react";

interface TipRow {
  label: string;
  value: string;
  color?: string;
}

// Shared tooltip shell — consistent across every chart. Text uses ink tokens;
// identity carried by the swatch, never by coloring the value text.
export function TipShell({ title, rows }: { title?: string; rows: TipRow[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 shadow-pop">
      {title && (
        <div className="mb-1.5 text-[12px] font-semibold text-[var(--text-primary)]">{title}</div>
      )}
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px]">
            {r.color && (
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: r.color }} />
            )}
            <span className="text-[var(--text-secondary)]">{r.label}</span>
            <span className="ml-auto font-semibold tnum text-[var(--text-primary)]">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Generic recharts formatter adapter.
export function makeTooltip(
  fmt: (name: string, value: number, payload: Record<string, unknown>) => TipRow | null,
  titleFmt?: (label: string, payload: Record<string, unknown>) => string
) {
  const Comp = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const rows = payload
      .map((p: any) => fmt(p.name ?? p.dataKey, p.value, p.payload))
      .filter(Boolean) as TipRow[];
    if (!rows.length) return null;
    const title = titleFmt ? titleFmt(label, payload[0]?.payload) : (label as string);
    return <TipShell title={title} rows={rows} />;
  };
  Comp.displayName = "ChartTooltip";
  return Comp;
}
