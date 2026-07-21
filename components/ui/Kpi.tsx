import React from "react";
import { cn } from "@/lib/cn";
import { Sparkline } from "./Sparkline";

// Compact stat tile. Sparing use — the brief asks NOT to flood with big-number cards.
export function Kpi({
  label,
  value,
  sub,
  delta,
  deltaGood,
  spark,
  color = "#465907",
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  delta?: string;
  deltaGood?: boolean;
  spark?: number[];
  color?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-card overflow-hidden",
        className
      )}
    >
      <span
        className="absolute left-0 top-4 h-7 w-[3px] rounded-full"
        style={{ background: color }}
      />
      <div className="flex items-center gap-1.5 pl-2 text-[12px] font-medium text-[var(--text-secondary)]">
        {icon && <span style={{ color }}>{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 pl-2 text-[21px] sm:text-[24px] leading-none font-semibold text-[var(--text-primary)] whitespace-nowrap">
        {value}
      </div>
      {sub && <div className="mt-1.5 pl-2 text-[12px] text-[var(--text-muted)] truncate">{sub}</div>}

      {spark && (
        <div className="mt-3 -mb-1 w-full">
          <Sparkline data={spark} color={color} width={220} height={30} responsive />
        </div>
      )}
      {delta && (
        <div className="mt-2 pl-2 text-[12px] font-medium" style={{ color: deltaGood ? "#0ca30c" : "#c0392b" }}>
          {delta}
        </div>
      )}
    </div>
  );
}
