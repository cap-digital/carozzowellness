"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ApiResponse, Row } from "@/lib/types";
import { normalize, uniqueDates } from "@/lib/metrics";
import { gaUniqueDates, type GAdsResponse, type GAdsRow, type GAdsTermRow } from "@/lib/googleAds";

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
  rows: Row[]; // Meta rows filtered by range (edge function)
  googleSearchRows: GAdsRow[]; // Google Search (Ads API), filtered by range
  youtubeRows: GAdsRow[]; // YouTube (Ads API), filtered by range
  searchTerms: GAdsTermRow[]; // Search terms (aggregated over the API window)
  googleError: string | null; // Google Ads layer failed (Meta still works)
  dates: string[]; // unique sorted union across platforms (full)
  activeDates: string[]; // unique sorted (filtered)
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  updatedAt: string | null;
  platforms: { meta: number; google: number; youtube: number; programatica: number };
  refresh: () => void;
}

const DataCtx = createContext<Ctx | null>(null);

const EMPTY_GADS: GAdsResponse = { success: false, rows: [], searchTerms: [] };

function rangeDates(all: string[], range: RangeKey): string[] {
  if (range === "all" || all.length === 0) return all;
  const n = range === "7d" ? 7 : range === "3d" ? 3 : 1;
  return all.slice(Math.max(0, all.length - n));
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [raw, setRaw] = useState<ApiResponse | null>(null);
  const [gads, setGads] = useState<GAdsResponse>(EMPTY_GADS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("all");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      // Meta + Programática (edge). This one is required.
      fetch("/api/meta").then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))),
      // Google Search + YouTube (Google Ads API). Optional — degrade gracefully.
      fetch("/api/google-ads")
        .then((r) => r.json())
        .catch(() => EMPTY_GADS),
    ])
      .then(([meta, g]: [ApiResponse, GAdsResponse]) => {
        if (!alive) return;
        if (!meta.success) throw new Error("Resposta sem sucesso");
        setRaw(meta);
        setGads(g && Array.isArray(g.rows) ? g : EMPTY_GADS);
        setError(null);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [nonce]);

  const allRows = useMemo<Row[]>(() => (raw?.meta ? raw.meta.map(normalize) : []), [raw]);
  const gadsRows = gads.rows;

  // Unified date window across all platforms so the range filter is consistent.
  const dates = useMemo(() => {
    const metaDates = uniqueDates(allRows);
    const gDates = gaUniqueDates(gadsRows);
    return [...new Set([...metaDates, ...gDates])].sort();
  }, [allRows, gadsRows]);
  const activeDates = useMemo(() => rangeDates(dates, range), [dates, range]);

  const rows = useMemo(() => {
    if (range === "all") return allRows;
    const keep = new Set(activeDates);
    return allRows.filter((r) => keep.has(r.date));
  }, [allRows, activeDates, range]);

  const inRange = useMemo(() => {
    const keep = new Set(activeDates);
    return (r: GAdsRow) => range === "all" || keep.has(r.date);
  }, [activeDates, range]);

  const googleSearchRows = useMemo(
    () => gadsRows.filter((r) => r.channel === "search" && inRange(r)),
    [gadsRows, inRange]
  );
  const youtubeRows = useMemo(
    () => gadsRows.filter((r) => r.channel === "youtube" && inRange(r)),
    [gadsRows, inRange]
  );

  const value: Ctx = {
    loading,
    error,
    allRows,
    rows,
    googleSearchRows,
    youtubeRows,
    searchTerms: gads.searchTerms ?? [],
    googleError: gads.success ? null : gads.error ?? null,
    dates,
    activeDates,
    range,
    setRange,
    updatedAt: raw?.timestamp ?? null,
    platforms: {
      meta: raw?.meta?.length ?? 0,
      google: gadsRows.filter((r) => r.channel === "search").length,
      youtube: gadsRows.filter((r) => r.channel === "youtube").length,
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
