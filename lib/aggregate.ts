import { Row } from "./types";
import {
  sum, derive, groupSum, byDate,
  primaryDef, primaryResult, costPerPrimary, PRIMARY_BY_OBJECTIVE,
} from "./metrics";
import { OBJECTIVE_COLOR, FORMAT_COLOR, SERIES } from "./theme";

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

// Bottom-funnel conversions = each conversion campaign counted by ITS métrica mãe.
export function totalConversions(rows: Row[]): number {
  return groupSum(rows, (r) => r.objective).reduce((s, g) => {
    const def = PRIMARY_BY_OBJECTIVE[g.key];
    return def && def.isConversion ? s + primaryResult(g.key, g.totals) : s;
  }, 0);
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
