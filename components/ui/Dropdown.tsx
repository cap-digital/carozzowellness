"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DropOption<T extends string> {
  value: T;
  label: string;
  color?: string;
}

export function Dropdown<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  align = "left",
  swatch,
}: {
  options: DropOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  align?: "left" | "right";
  swatch?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]",
          size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[12.5px]"
        )}
      >
        {swatch && current?.color && (
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: current.color }} />
        )}
        <span className="truncate max-w-[150px]">{current?.label ?? "Selecionar"}</span>
        <ChevronDown size={14} className={cn("text-[var(--text-muted)] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-30 mt-1.5 min-w-[180px] max-h-[280px] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1 shadow-pop",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors",
                  active ? "bg-[var(--surface-2)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                )}
              >
                {o.color && <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: o.color }} />}
                <span className="flex-1 truncate">{o.label}</span>
                {active && <Check size={14} className="shrink-0 text-[var(--brand)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
