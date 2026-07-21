"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/cn";
import { ArrowUpDown } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  width?: string;
}

export function DataTable<T>({
  columns,
  data,
  initialSort,
  rowKey,
  maxHeight,
}: {
  columns: Column<T>[];
  data: T[];
  initialSort?: { key: string; dir: "asc" | "desc" };
  rowKey: (row: T, i: number) => string;
  maxHeight?: number;
}) {
  const [sort, setSort] = useState(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return data;
    const arr = [...data];
    arr.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [data, sort, columns]);

  const toggle = (key: string) =>
    setSort((s) =>
      s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    );

  return (
    <div className="overflow-x-auto" style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}>
      <table className="w-full border-collapse text-[12.5px]">
        <thead className="sticky top-0 z-10 bg-[var(--surface-1)]">
          <tr className="border-b border-[var(--border)]">
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width }}
                className={cn(
                  "whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]",
                  c.align === "right" ? "text-right" : "text-left"
                )}
              >
                {c.sortValue ? (
                  <button
                    onClick={() => toggle(c.key)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-[var(--text-secondary)]",
                      c.align === "right" && "flex-row-reverse",
                      sort?.key === c.key && "text-[var(--text-primary)]"
                    )}
                  >
                    {c.header}
                    <ArrowUpDown size={12} className="opacity-60" />
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              className="border-b border-[var(--border)]/60 transition-colors last:border-0 hover:bg-[var(--surface-2)]"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-3 py-2.5 align-middle",
                    c.align === "right" ? "text-right tnum" : "text-left"
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
