"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ApiResponse, Row } from "@/lib/types";
import { normalize, uniqueDates } from "@/lib/metrics";
import { normalizeGoogle, gUniqueDates, type GoogleRaw, type GoogleRow } from "@/lib/google";

export type RangeKey = "all" | "7d" | "3d" | "1d";

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: "all", label: "Todo o período" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "3d", label: "Últimos 3 dias" },
  { key: "1d", label: "Último dia" },
];

interface Ctx {
  loading: boolean;
  error: string | null;
  allRows: Row[];
  rows: Row[]; // filtered by range
  googleRows: GoogleRow[]; // Google Search rows, filtered by range
  dates: string[]; // unique sorted (full dataset)
  activeDates: string[]; // unique sorted (filtered)
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  updatedAt: string | null;
  platforms: { meta: number; google: number; youtube: number; programatica: number };
  refresh: () => void;
}

const DataCtx = createContext<Ctx | null>(null);

function rangeDates(all: string[], range: RangeKey): string[] {
  if (range === "all" || all.length === 0) return all;
  const n = range === "7d" ? 7 : range === "3d" ? 3 : 1;
  return all.slice(Math.max(0, all.length - n));
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [raw, setRaw] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("all");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch("/api/meta")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: ApiResponse) => {
        if (!alive) return;
        if (!d.success) throw new Error("Resposta sem sucesso");
        setRaw(d);
        setError(null);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [nonce]);

  const allRows = useMemo<Row[]>(
    () => (raw?.meta ? raw.meta.map(normalize) : []),
    [raw]
  );
  const dates = useMemo(() => uniqueDates(allRows), [allRows]);
  const activeDates = useMemo(() => rangeDates(dates, range), [dates, range]);
  const rows = useMemo(() => {
    if (range === "all") return allRows;
    const keep = new Set(activeDates);
    return allRows.filter((r) => keep.has(r.date));
  }, [allRows, activeDates, range]);

  // Google Search rows — filtered by range using Google's own date set.
  const googleAll = useMemo<GoogleRow[]>(
    () => (raw?.google ? (raw.google as GoogleRaw[]).map(normalizeGoogle) : []),
    [raw]
  );
  const googleRows = useMemo(() => {
    if (range === "all") return googleAll;
    const keep = new Set(rangeDates(gUniqueDates(googleAll), range));
    return googleAll.filter((r) => keep.has(r.date));
  }, [googleAll, range]);

  const value: Ctx = {
    loading,
    error,
    allRows,
    rows,
    googleRows,
    dates,
    activeDates,
    range,
    setRange,
    updatedAt: raw?.timestamp ?? null,
    platforms: {
      meta: raw?.meta?.length ?? 0,
      google: raw?.google?.length ?? 0,
      youtube: raw?.youtube?.length ?? 0,
      programatica: raw?.programatica?.length ?? 0,
    },
    refresh: () => setNonce((n) => n + 1),
  };

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData() {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
