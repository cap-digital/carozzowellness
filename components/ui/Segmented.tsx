"use client";

import React from "react";
import { cn } from "@/lib/cn";

export interface SegOption<T extends string> {
  value: T;
  label: string;
}

// Compact pill segmented control — the one-row filter above charts.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-0.5",
        size === "sm" ? "text-[11.5px]" : "text-[12.5px]"
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full font-medium transition-colors whitespace-nowrap",
              size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5",
              active
                ? "bg-[var(--surface-1)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
