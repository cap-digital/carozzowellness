import { num } from "./metrics";

// Raw row from the Supabase function `google[]` — Google Search campaign.
export interface GoogleRaw {
  date: string;
  campaign: string;
  ad_group_name: string;
  ad_name: string;
  spend: number | string;
  clicks: number | string;
  impressions: number | string;
  search_term: string;
}

export interface GoogleRow {
  date: string; // yyyy-mm-dd
  campaign: string;
  adGroup: string;
  term: string;
  spend: number;
  clicks: number;
  impressions: number;
}

const div = (a: number, b: number) => (b > 0 ? a / b : 0);

export function normalizeGoogle(r: GoogleRaw): GoogleRow {
  return {
    date: String(r.date).slice(0, 10),
    campaign: r.campaign,
    adGroup: r.ad_group_name,
    term: (r.search_term || "").trim() || "(sem termo)",
    spend: num(r.spend),
    clicks: num(r.clicks),
    impressions: num(r.impressions),
  };
}

export interface GTotals {
  spend: number;
  clicks: number;
  impressions: number;
  rows: number;
}

export function gSum(rows: GoogleRow[]): GTotals {
  const t: GTotals = { spend: 0, clicks: 0, impressions: 0, rows: 0 };
  for (const r of rows) {
    t.spend += r.spend;
    t.clicks += r.clicks;
    t.impressions += r.impressions;
    t.rows += 1;
  }
  return t;
}

export interface GDerived {
  ctr: number; // clicks / impressions * 100
  cpc: number; // spend / clicks
  cpm: number; // spend / impressions * 1000
}

export function gDerive(t: GTotals): GDerived {
  return {
    ctr: div(t.clicks, t.impressions) * 100,
    cpc: div(t.spend, t.clicks),
    cpm: div(t.spend, t.impressions) * 1000,
  };
}

export const gUniqueDates = (rows: GoogleRow[]) =>
  [...new Set(rows.map((r) => r.date))].sort();

// Daily aggregation, chronological.
export function gDaily(rows: GoogleRow[]) {
  const map = new Map<string, GTotals>();
  for (const r of rows) {
    const t = map.get(r.date) ?? { spend: 0, clicks: 0, impressions: 0, rows: 0 };
    t.spend += r.spend; t.clicks += r.clicks; t.impressions += r.impressions; t.rows += 1;
    map.set(r.date, t);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, t]) => ({
      date,
      spend: +t.spend.toFixed(2),
      clicks: t.clicks,
      impressions: t.impressions,
      ctr: +gDerive(t).ctr.toFixed(2),
      cpc: +gDerive(t).cpc.toFixed(2),
    }));
}

export interface CampaignStat {
  campaign: string;
  spend: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

// Aggregate per campaign, sorted by spend desc.
export function gByCampaign(rows: GoogleRow[]): CampaignStat[] {
  const map = new Map<string, GTotals>();
  for (const r of rows) {
    const t = map.get(r.campaign) ?? { spend: 0, clicks: 0, impressions: 0, rows: 0 };
    t.spend += r.spend; t.clicks += r.clicks; t.impressions += r.impressions; t.rows += 1;
    map.set(r.campaign, t);
  }
  return [...map.entries()]
    .map(([campaign, t]) => {
      const d = gDerive(t);
      return { campaign, spend: t.spend, clicks: t.clicks, impressions: t.impressions, ctr: d.ctr, cpc: d.cpc, cpm: d.cpm };
    })
    .sort((a, b) => b.spend - a.spend);
}

export interface TermStat {
  term: string;
  spend: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
}

// Aggregate per search term, sorted by impressions desc.
export function gTermBreakdown(rows: GoogleRow[]): TermStat[] {
  const map = new Map<string, GTotals>();
  for (const r of rows) {
    const t = map.get(r.term) ?? { spend: 0, clicks: 0, impressions: 0, rows: 0 };
    t.spend += r.spend; t.clicks += r.clicks; t.impressions += r.impressions; t.rows += 1;
    map.set(r.term, t);
  }
  return [...map.entries()]
    .map(([term, t]) => ({
      term,
      spend: t.spend,
      clicks: t.clicks,
      impressions: t.impressions,
      ctr: gDerive(t).ctr,
      cpc: gDerive(t).cpc,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}
