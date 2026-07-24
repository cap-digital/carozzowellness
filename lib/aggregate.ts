import { Row } from "./types";
import {
  sum, derive, groupSum, byDate,
  primaryDef, primaryResult, costPerPrimary,
  CONVERSION_METRICS, CONVERSION_OBJECTIVE, type ConversionMetric,
} from "./metrics";
import { OBJECTIVE_COLOR, FORMAT_COLOR, SERIES } from "./theme";

// Per-conversion-action stats, each computed from ITS OWN campaign strategy —
// count, spend, cost (spend ÷ count) and rate (count ÷ link clicks). Using the
// owning campaign's spend (not the global total) is what makes the cost correct.
export interface ConversionStat extends ConversionMetric {
  count: number;
  spend: number;
  cost: number;
  rate: number;
}

export function conversionStats(rows: Row[]): ConversionStat[] {
  const byObj = new Map(groupSum(rows, (r) => r.objective).map((g) => [g.key, g.totals]));
  return CONVERSION_METRICS.map((m) => {
    const t = byObj.get(CONVERSION_OBJECTIVE[m.key]);
    const count = t ? (t[m.key] as number) : 0;
    const spend = t ? t.spend : 0;
    const clicks = t ? t.linkClicks : 0;
    return {
      ...m,
      count,
      spend,
      cost: count > 0 ? spend / count : 0,
      rate: clicks > 0 ? (count / clicks) * 100 : 0,
    };
  });
}

// Objective ("ID3 ... [ALCANCE]") breakdown, sorted by spend desc.
// Carries the campaign's "métrica mãe" (primary result) — the KPI its objective
// is optimized for — instead of a blanket conversion sum.
export function objectiveBreakdown(rows: Row[]) {
  return groupSum(rows, (r) => r.objective)
    .map((g, i) => ({
      key: g.key,
      totals: g.totals,
      derived: derive(g.totals),
      rows: g.rows,
      color: OBJECTIVE_COLOR[g.key] ?? SERIES[i % SERIES.length],
      primary: primaryDef(g.key),
      primaryValue: primaryResult(g.key, g.totals),
      costPerResult: costPerPrimary(g.key, g.totals),
    }))
    .sort((a, b) => b.totals.spend - a.totals.spend);
}

export function formatBreakdown(rows: Row[]) {
  return groupSum(rows, (r) => r.format)
    .map((g) => ({
      key: g.key,
      totals: g.totals,
      derived: derive(g.totals),
      rows: g.rows,
      color: FORMAT_COLOR[g.key] ?? "#8b8b8b",
    }))
    .sort((a, b) => b.totals.spend - a.totals.spend);
}

export function placementBreakdown(rows: Row[]) {
  return groupSum(rows, (r) => r.placement)
    .map((g, i) => ({
      key: g.key,
      totals: g.totals,
      derived: derive(g.totals),
      rows: g.rows,
      color: SERIES[i % SERIES.length],
    }))
    .sort((a, b) => b.totals.spend - a.totals.spend);
}

// Per-creative aggregation, carrying the first non-empty thumb/permalink.
export function adBreakdown(rows: Row[]) {
  const groups = groupSum(rows, (r) => r.ad);
  return groups
    .map((g) => {
      const withThumb = g.rows.find((r) => r.thumb);
      const withLink = g.rows.find((r) => r.permalink);
      const objective = g.rows[0]?.objective ?? "";
      return {
        ad: g.key,
        format: g.rows[0]?.format ?? "Outro",
        objective,
        thumb: withThumb?.thumb ?? "",
        permalink: withLink?.permalink ?? "",
        totals: g.totals,
        derived: derive(g.totals),
        primary: primaryDef(objective),
        primaryValue: primaryResult(objective, g.totals),
        costPerResult: costPerPrimary(objective, g.totals),
      };
    })
    .sort((a, b) => b.totals.spend - a.totals.spend);
}

export interface DailyPoint {
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  engagement: number;
  leads: number;
  whatsapp: number;
  conversations: number;
  leadGrouped: number;
  videoViews: number;
  cpm: number;
  ctr: number;
  cpc: number;
  frequency: number;
}

export function dailySeries(rows: Row[]): DailyPoint[] {
  return byDate(rows).map((g) => {
    const t = g.totals;
    const d = derive(t);
    return {
      date: g.key,
      spend: +t.spend.toFixed(2),
      impressions: t.impressions,
      reach: t.reach,
      clicks: t.clicks,
      linkClicks: t.linkClicks,
      engagement: t.engagement,
      leads: t.leads,
      whatsapp: t.whatsapp,
      conversations: t.conversations,
      leadGrouped: t.leadGrouped,
      videoViews: t.videoViews,
      cpm: +d.cpm.toFixed(2),
      ctr: +d.ctr.toFixed(3),
      cpc: +d.cpc.toFixed(2),
      frequency: +d.frequency.toFixed(2),
    };
  });
}

// Ordered age buckets present in the data.
export const AGE_ORDER = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+", "Unknown"];

export function orderedAges(rows: Row[]) {
  const present = new Set(rows.map((r) => r.age));
  return AGE_ORDER.filter((a) => present.has(a));
}

// Build a matrix [age][gender] for a chosen metric.
export function ageGenderMatrix(
  rows: Row[],
  genders: string[],
  metric: (r: Row) => number
) {
  const ages = orderedAges(rows);
  const idx = (a: string, g: string) => `${a}||${g}`;
  const acc = new Map<string, number>();
  for (const r of rows) {
    const k = idx(r.age, r.gender);
    acc.set(k, (acc.get(k) ?? 0) + metric(r));
  }
  const matrix = ages.map((a) => genders.map((g) => acc.get(idx(a, g)) ?? 0));
  return { ages, matrix };
}

export function genderBreakdown(rows: Row[]) {
  return groupSum(rows, (r) => r.gender).map((g) => ({
    key: g.key,
    totals: g.totals,
  }));
}

export function ageBreakdown(rows: Row[]) {
  const map = groupSum(rows, (r) => r.age);
  const order = new Map(AGE_ORDER.map((a, i) => [a, i]));
  return map.sort(
    (a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99)
  );
}

export { sum, derive };
