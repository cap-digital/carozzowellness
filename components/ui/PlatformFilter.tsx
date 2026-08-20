"use client";

import React from "react";
import { cn } from "@/lib/cn";
import { PLATFORM_COLOR, type PlatformKey } from "@/lib/combined";

export type FilterKey = PlatformKey | "all";

export interface PlatformOption {
  key: FilterKey;
  label: string;
}

// Pill filter used across the Análises subpages. Shows only the platforms that
// actually have data on that page (passed in `options`), plus "Todas".
export function PlatformFilter({
  options,
  value,
  onChange,
}: {
  options: PlatformOption[];
  value: FilterKey;
  onChange: (k: FilterKey) => void;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
      {options.map((o) => {
        const active = value === o.key;
        const color = o.key === "all" ? "#465907" : PLATFORM_COLOR[o.key];
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
              active
                ? "bg-[var(--surface-1)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
