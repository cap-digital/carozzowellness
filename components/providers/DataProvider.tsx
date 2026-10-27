"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Row } from "@/lib/types";
import { uniqueDates } from "@/lib/metrics";
import { shiftIso, todayIso } from "@/lib/format";
import { expandMeta, type MetaCompact } from "@/lib/compact";
import { gaUniqueDates, type GAdsAdGroupRow, type GAdsCreative, type GAdsDemographics, type GAdsResponse, type GAdsRetention, type GAdsRow, type GAdsTermRow } from "@/lib/googleAds";

export type RangeKey = "all" | "7d" | "3d" | "1d" | "custom";

export interface CustomRange {
  start: string;
  end: string;
}

// Preset ranges shown as pills (custom range is a separate date picker).
export const RANGES: { key: RangeKey; label: string }[] = [
  { key: "all", label: "Todo o período" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "3d", label: "Últimos 3 dias" },
  { key: "1d", label: "Ontem" },
];

interface Ctx {
  loading: boolean;
  error: string | null;
  allRows: Row[];
  rows: Row[]; // Meta rows filtered by range (edge function)
  googleSearchRows: GAdsRow[]; // Google Search (Ads API), filtered by range
  youtubeRows: GAdsRow[]; // YouTube (Ads API), filtered by range
  searchTerms: GAdsTermRow[]; // Search terms (aggregated over the API window)
  videoRetention: GAdsRetention | null; // YouTube quartile retention
  youtubeCreatives: GAdsCreative[]; // YouTube video creatives
  youtubeAdGroups: GAdsAdGroupRow[]; // YouTube ad groups per day, filtered by range
  demographics: GAdsDemographics | null; // Google/YouTube age + gender
  googleLoading: boolean; // Google Ads layer still loading (Meta already rendered)
  googleError: string | null; // Google Ads layer failed (Meta still works)
  dates: string[]; // unique sorted union across platforms (full)
  activeDates: string[]; // unique sorted (filtered)
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  customRange: CustomRange | null;
  applyCustomRange: (start: string, end: string) => void; // sets range to "custom"
  updatedAt: string | null;
  platforms: { meta: number; google: number; youtube: number };
  refresh: () => void;
}

const DataCtx = createContext<Ctx | null>(null);

const EMPTY_GADS: GAdsResponse = { success: false, rows: [], searchTerms: [] };

// Presets are anchored to the CALENDAR, ending YESTERDAY — today is still
// running, so its spend is partial and would drag every rate down. ("Ontem" on
// 27/10 = 26/10; "Últimos 3 dias" = 24–26/10.)
// Anchoring on the calendar rather than on "the last N dates present in the
// data" also keeps the window right when a day has no delivery at all.
function rangeDates(all: string[], range: RangeKey): string[] {
  if (range === "all" || all.length === 0) return all;
  const n = range === "7d" ? 7 : range === "3d" ? 3 : 1;
  const end = shiftIso(todayIso(), -1);
  const start = shiftIso(end, -(n - 1));
  return all.filter((d) => d >= start && d <= end);
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [raw, setRaw] = useState<MetaCompact | null>(null);
  const [gads, setGads] = useState<GAdsResponse>(EMPTY_GADS);
  const [loading, setLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("all");
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [nonce, setNonce] = useState(0);

  const applyCustomRange = (start: string, end: string) => {
    const [lo, hi] = start <= end ? [start, end] : [end, start];
    setCustomRange({ start: lo, end: hi });
    setRange("custom");
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setGoogleLoading(true);

    // The first load takes the cached path (instant); only an explicit
    // "Atualizar" click asks the routes to go back to the source.
    const qs = nonce > 0 ? "?refresh=1" : "";

    // Meta (edge) — required. Gates the page skeleton so the dashboard renders
    // as soon as Meta is ready, without waiting on Google Ads.
    fetch(`/api/meta${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((meta: MetaCompact) => {
        if (!alive) return;
        if (!meta.success) throw new Error(meta.error || "Resposta sem sucesso");
        setRaw(meta);
        setError(null);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));

    // Google Search + YouTube (Google Ads API) — loads in the background and
    // fills in when ready. Degrades gracefully on failure.
    fetch(`/api/google-ads${qs}`)
      .then((r) => r.json())
      .then((g: GAdsResponse) => alive && setGads(g && Array.isArray(g.rows) ? g : EMPTY_GADS))
      .catch(() => alive && setGads(EMPTY_GADS))
      .finally(() => alive && setGoogleLoading(false));

    return () => {
      alive = false;
    };
  }, [nonce]);

  const allRows = useMemo<Row[]>(() => (raw ? expandMeta(raw) : []), [raw]);
  const gadsRows = gads.rows;

  // Unified date window across all platforms so the range filter is consistent.
  const dates = useMemo(() => {
    const metaDates = uniqueDates(allRows);
    const gDates = gaUniqueDates(gadsRows);
    return [...new Set([...metaDates, ...gDates])].sort();
  }, [allRows, gadsRows]);
  const activeDates = useMemo(() => {
    if (range === "custom") {
      if (!customRange) return dates;
      return dates.filter((d) => d >= customRange.start && d <= customRange.end);
    }
    return rangeDates(dates, range);
  }, [dates, range, customRange]);

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

  const youtubeAdGroups = useMemo(
    () => (gads.youtubeAdGroups ?? []).filter((r) => range === "all" || new Set(activeDates).has(r.date)),
    [gads.youtubeAdGroups, activeDates, range]
  );

  const value: Ctx = {
    loading,
    error,
    allRows,
    rows,
    googleSearchRows,
    youtubeRows,
    searchTerms: gads.searchTerms ?? [],
    videoRetention: gads.videoRetention ?? null,
    youtubeCreatives: gads.youtubeCreatives ?? [],
    youtubeAdGroups,
    demographics: gads.demographics ?? null,
    googleLoading,
    googleError: gads.success ? null : gads.error ?? null,
    dates,
    activeDates,
    range,
    setRange,
    customRange,
    applyCustomRange,
    updatedAt: raw?.timestamp ?? null,
    platforms: {
      meta: raw?.rows.length ?? 0,
      google: gadsRows.filter((r) => r.channel === "search").length,
      youtube: gadsRows.filter((r) => r.channel === "youtube").length,
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
