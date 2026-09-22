"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DropOption } from "./Dropdown";

// Multi-select sibling of <Dropdown>. An EMPTY selection means "all" — so the
// default state needs no bookkeeping, and clearing is just an empty array.
export function MultiDropdown<T extends string>({
  options,
  value,
  onChange,
  allLabel,
  unit,
  align = "left",
  searchable,
  wide,
}: {
  options: DropOption<T>[];
  value: T[];
  onChange: (v: T[]) => void;
  allLabel: string; // button text when nothing is selected, e.g. "Todas as campanhas"
  unit: [string, string]; // singular/plural for the count, e.g. ["campanha", "campanhas"]
  align?: "left" | "right";
  searchable?: boolean;
  wide?: boolean; // long labels wrap in full instead of truncating
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = new Set(value);
  const needle = q.trim().toLowerCase();
  const shown = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;

  useEffect(() => {
    if (!open) return setQ("");
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (v: T) => onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v]);
  const only = value.length === 1 ? options.find((o) => o.value === value[0]) : undefined;
  const label =
    value.length === 0 ? allLabel : only ? only.label : `${value.length} ${unit[1]}`;
  const swatch = only?.color;

  return (
    <div ref={ref} className="relative">
      <div
        className={cn(
          "inline-flex items-center rounded-full border bg-[var(--surface-1)] text-[12px] font-medium text-[var(--text-primary)] transition-colors",
          value.length ? "border-[#46590766]" : "border-[var(--border)]"
        )}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-2 hover:bg-[var(--surface-2)]"
        >
          {swatch && <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: swatch }} />}
          {value.length > 1 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand)] px-1 text-[10px] font-semibold text-white">
              {value.length}
            </span>
          )}
          <span className={cn("truncate", wide ? "max-w-[260px]" : "max-w-[170px]")} title={label}>
            {value.length > 1 ? unit[1] : label}
          </span>
          <ChevronDown size={14} className={cn("text-[var(--text-muted)] transition-transform", open && "rotate-180")} />
        </button>
        {value.length > 0 && (
          <button
            onClick={() => onChange([])}
            aria-label="Limpar seleção"
            title="Limpar seleção"
            className="mr-1 flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {open && (
        <div
          className={cn(
            "absolute z-30 mt-1.5 flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-pop",
            wide ? "w-[min(460px,calc(100vw-32px))]" : "min-w-[220px]",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {searchable && (
            <div className="p-1 pb-0">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar…"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-2.5 pb-1 pt-1.5 text-[11.5px]">
            <span className="text-[var(--text-muted)]">
              {value.length ? `${value.length} de ${options.length} selecionados` : `${options.length} ${options.length === 1 ? unit[0] : unit[1]}`}
            </span>
            <span className="flex shrink-0 gap-2 whitespace-nowrap">
              <button
                onClick={() => onChange([...new Set([...value, ...shown.map((o) => o.value)])])}
                className="font-medium text-[var(--brand)] hover:underline"
              >
                {needle ? "Marcar resultados" : "Marcar todos"}
              </button>
              {value.length > 0 && (
                <button onClick={() => onChange([])} className="font-medium text-[var(--text-secondary)] hover:underline">
                  Limpar
                </button>
              )}
            </span>
          </div>
          <div className={cn("overflow-y-auto border-t border-[var(--border)] p-1", wide ? "max-h-[340px]" : "max-h-[280px]")}>
            {shown.length === 0 && <div className="px-2.5 py-2 text-[12px] text-[var(--text-muted)]">Nada encontrado</div>}
            {shown.map((o) => {
              const on = selected.has(o.value);
              return (
                <button
                  key={o.value}
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors hover:bg-[var(--surface-2)]",
                    on ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  )}
                >
                  <span
                    className={cn(
                      "mt-[2px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border",
                      on ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--axis)] bg-[var(--surface-1)]"
                    )}
                  >
                    {on && <Check size={10} strokeWidth={3} />}
                  </span>
                  {o.color && <span className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: o.color }} />}
                  <span className={cn("flex-1", wide ? "whitespace-normal break-words leading-snug" : "truncate")}>{o.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
