import React from "react";

// Ad set / ad group names pack the targeting into bracket segments —
// "[P1] [SSA + RMS] [30+] [HM] [Interesse] [IG - Aut] [ADV+]". Splitting them
// into chips keeps every segment readable and lets the name wrap, so nothing
// ever gets cut off. Names without brackets render as plain wrapping text.
export function SegmentName({ name, color }: { name: string; color?: string }) {
  const parts = (name.match(/\[([^\]]+)\]/g) || []).map((b) => b.slice(1, -1).trim());
  const rest = name.replace(/\[[^\]]*\]/g, "").trim();

  if (parts.length === 0) {
    return <span className="whitespace-normal break-words font-medium text-[var(--text-primary)]">{name || "—"}</span>;
  }

  return (
    <span className="flex flex-wrap items-center gap-1" title={name}>
      {parts.map((p, i) => (
        <span
          key={i}
          className="whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-[1px] text-[11.5px] font-medium text-[var(--text-primary)]"
          style={i === 0 && color ? { borderColor: `${color}66`, background: `${color}14` } : undefined}
        >
          {p}
        </span>
      ))}
      {rest && <span className="whitespace-normal break-words text-[12px] text-[var(--text-secondary)]">{rest}</span>}
    </span>
  );
}
