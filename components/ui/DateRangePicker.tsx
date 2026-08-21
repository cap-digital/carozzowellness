"use client";

import React, { useEffect, useRef, useState } from "react";
import { CalendarRange } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/cn";

// Custom start/end date picker that sits next to the preset range pills.
export function DateRangePicker() {
  const { range, customRange, applyCustomRange, dates } = useData();
  const min = dates[0] ?? "";
  const max = dates[dates.length - 1] ?? "";
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(customRange?.start ?? "");
  const [end, setEnd] = useState(customRange?.end ?? "");
  const ref = useRef<HTMLDivElement>(null);

  // Seed the inputs when opening (from the active custom range or the full span).
  useEffect(() => {
    if (open) {
      setStart(customRange?.start ?? min);
      setEnd(customRange?.end ?? max);
    }
  }, [open, customRange, min, max]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = range === "custom" && !!customRange;
  const apply = () => {
    if (!start || !end) return;
    applyCustomRange(start, end);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
          active
            ? "border-[var(--brand)] bg-[var(--surface-1)] text-[var(--text-primary)]"
            : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        )}
      >
        <CalendarRange size={13} />
        <span className="whitespace-nowrap">
          {active && customRange ? `${shortDate(customRange.start)} – ${shortDate(customRange.end)}` : "Personalizado"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[260px] rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-pop">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Período personalizado</div>
          <div className="space-y-2">
            <label className="flex items-center justify-between gap-2 text-[12px] text-[var(--text-secondary)]">
              <span>Início</span>
              <input
                type="date"
                value={start}
                min={min}
                max={end || max}
                onChange={(e) => setStart(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-[12px] text-[var(--text-secondary)]">
              <span>Fim</span>
              <input
                type="date"
                value={end}
                min={start || min}
                max={max}
                onChange={(e) => setEnd(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
              />
            </label>
          </div>
          <button
            onClick={apply}
            disabled={!start || !end}
            className="mt-3 w-full rounded-lg bg-[var(--brand)] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity disabled:opacity-40"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
