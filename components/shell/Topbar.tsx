"use client";

import { usePathname } from "next/navigation";
import { Menu, RefreshCw, CalendarRange } from "lucide-react";
import { NAV } from "./nav";
import { useData, RANGES } from "@/components/providers/DataProvider";
import { Segmented } from "@/components/ui/Segmented";
import { shortDate } from "@/lib/format";

function useTitle() {
  const pathname = usePathname();
  for (const s of NAV) {
    for (const i of s.items) {
      if (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)) {
        return { title: i.label, section: s.title };
      }
    }
  }
  return { title: "Visão geral", section: "" };
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { title } = useTitle();
  const { range, setRange, activeDates, updatedAt, refresh, loading } = useData();

  const period =
    activeDates.length > 1
      ? `${shortDate(activeDates[0])} – ${shortDate(activeDates[activeDates.length - 1])}`
      : activeDates.length === 1
      ? shortDate(activeDates[0])
      : "—";

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--page)_82%,transparent)] backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-7">
        <button
          onClick={onMenu}
          aria-label="Abrir menu"
          className="lg:hidden rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2 text-[var(--text-secondary)]"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[19px] font-semibold leading-tight tracking-tight text-[var(--text-primary)] sm:text-[22px]">
            {title}
          </h1>
          <div className="mt-0.5 hidden items-center gap-1.5 text-[12px] text-[var(--text-muted)] sm:flex">
            <CalendarRange size={13} />
            <span>{period}</span>
          </div>
        </div>

        <div className="hidden md:block">
          <Segmented
            size="sm"
            value={range}
            onChange={setRange}
            options={RANGES.map((r) => ({ value: r.key, label: r.label }))}
          />
        </div>

        <button
          onClick={refresh}
          aria-label="Atualizar dados"
          title={updatedAt ? `Atualizado ${new Date(updatedAt).toLocaleString("pt-BR")}` : "Atualizar"}
          className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Mobile range filter row */}
      <div className="md:hidden overflow-x-auto no-scrollbar px-4 pb-2.5">
        <Segmented
          size="sm"
          value={range}
          onChange={setRange}
          options={RANGES.map((r) => ({ value: r.key, label: r.label }))}
        />
      </div>
    </header>
  );
}
