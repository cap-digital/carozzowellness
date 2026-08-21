// Cross-platform aggregation for the non-platform-specific pages (Visão Geral,
// Campanhas, Custos). Combines Meta (edge) + Programática (edge) + Google Search
// + YouTube (Ads API). Programática has no data yet → contributes zeros.
import type { Totals } from "./types";
import { derive } from "./metrics";
import { isValidDate } from "./format";
import { gaSum, gaDerive, type GAdsRow } from "./googleAds";

export type PlatformKey = "meta" | "google" | "youtube" | "programatica";

export interface PlatformAgg {
  key: PlatformKey;
  label: string;
  color: string;
  spend: number;
  impressions: number;
  clicks: number; // Meta: link clicks · Google/YouTube: clicks
  ctr: number;
  cpc: number;
  cpm: number;
  views: number; // YouTube TrueView views (0 for others)
  vtr: number; // YouTube view rate (0 for others)
  cpv: number; // YouTube cost per view (0 for others)
}

export const PLATFORM_COLOR: Record<PlatformKey, string> = {
  meta: "#2f80c4",
  google: "#e0a010",
  youtube: "#cf3a5f",
  programatica: "#8a63d4",
};

// Per-platform aggregates (always all four, in fixed order — zeros stay visible).
export function platformAggs(meta: Totals, search: GAdsRow[], youtube: GAdsRow[]): PlatformAgg[] {
  const md = derive(meta);
  const s = gaSum(search), sd = gaDerive(s);
  const y = gaSum(youtube), yd = gaDerive(y);
  return [
    { key: "meta", label: "Meta Ads", color: PLATFORM_COLOR.meta, spend: meta.spend, impressions: meta.impressions, clicks: meta.linkClicks, ctr: md.ctrLink, cpc: md.cpcLink, cpm: md.cpm, views: 0, vtr: 0, cpv: 0 },
    { key: "google", label: "Google Pesquisa", color: PLATFORM_COLOR.google, spend: s.spend, impressions: s.impressions, clicks: s.clicks, ctr: sd.ctr, cpc: sd.cpc, cpm: sd.cpm, views: 0, vtr: 0, cpv: 0 },
    { key: "youtube", label: "YouTube", color: PLATFORM_COLOR.youtube, spend: y.spend, impressions: y.impressions, clicks: y.clicks, ctr: yd.ctr, cpc: yd.cpc, cpm: yd.cpm, views: y.views, vtr: yd.vtr, cpv: yd.cpv },
    { key: "programatica", label: "Programática", color: PLATFORM_COLOR.programatica, spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, views: 0, vtr: 0, cpv: 0 },
  ];
}

export interface CombinedTotals {
  spend: number;
  impressions: number;
  clicks: number;
}

export function combinedTotals(aggs: PlatformAgg[]): CombinedTotals {
  return aggs.reduce(
    (a, p) => ({ spend: a.spend + p.spend, impressions: a.impressions + p.impressions, clicks: a.clicks + p.clicks }),
    { spend: 0, impressions: 0, clicks: 0 }
  );
}

// Combined daily spend across platforms, chronological. Each source contributes
// its own per-day spend; missing days simply don't add.
export function combinedDailySpend(
  metaDaily: { date: string; spend: number }[],
  ...adsDaily: { date: string; spend: number }[][]
): { date: string; spend: number }[] {
  const map = new Map<string, number>();
  const add = (p: { date: string; spend: number }) => {
    if (isValidDate(p.date)) map.set(p.date, (map.get(p.date) ?? 0) + p.spend);
  };
  for (const p of metaDaily) add(p);
  for (const series of adsDaily) for (const p of series) add(p);
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, spend]) => ({ date, spend: +spend.toFixed(2) }));
}
