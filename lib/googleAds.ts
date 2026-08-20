// Google Ads API layer (Search + YouTube channels for Carozzo Wellness).
// Data comes from the server route /api/google-ads (Google Ads API v25), NOT the
// edge function. Shapes here mirror that route's normalized JSON response.

export type GAdsChannel = "search" | "youtube";

export interface GAdsRow {
  date: string; // yyyy-mm-dd
  channel: GAdsChannel;
  campaign: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  views: number; // TrueView video views (YouTube); 0 for Search
}

export interface GAdsTermRow {
  term: string;
  spend: number;
  clicks: number;
  impressions: number;
}

export interface GAdsResponse {
  success: boolean;
  rows: GAdsRow[];
  searchTerms: GAdsTermRow[];
  timestamp?: string;
  error?: string;
}

const div = (a: number, b: number) => (b > 0 ? a / b : 0);

export interface GAdsTotals {
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  views: number;
  rows: number;
}

export function gaSum(rows: GAdsRow[]): GAdsTotals {
  const t: GAdsTotals = { spend: 0, clicks: 0, impressions: 0, conversions: 0, views: 0, rows: 0 };
  for (const r of rows) {
    t.spend += r.spend;
    t.clicks += r.clicks;
    t.impressions += r.impressions;
    t.conversions += r.conversions;
    t.views += r.views;
    t.rows += 1;
  }
  return t;
}

export interface GAdsDerived {
  ctr: number; // clicks / impressions * 100
  cpc: number; // spend / clicks
  cpm: number; // spend / impressions * 1000
  vtr: number; // views / impressions * 100 (TrueView view rate)
  cpv: number; // spend / views (cost per view)
}

export function gaDerive(t: GAdsTotals): GAdsDerived {
  return {
    ctr: div(t.clicks, t.impressions) * 100,
    cpc: div(t.spend, t.clicks),
    cpm: div(t.spend, t.impressions) * 1000,
    vtr: div(t.views, t.impressions) * 100,
    cpv: div(t.spend, t.views),
  };
}

export const gaChannel = (rows: GAdsRow[], channel: GAdsChannel) => rows.filter((r) => r.channel === channel);

export const gaUniqueDates = (rows: GAdsRow[]) => [...new Set(rows.map((r) => r.date))].sort();

// Daily aggregation (chronological) for line/bar charts.
export function gaDaily(rows: GAdsRow[]) {
  const map = new Map<string, GAdsTotals>();
  for (const r of rows) {
    const t = map.get(r.date) ?? { spend: 0, clicks: 0, impressions: 0, conversions: 0, views: 0, rows: 0 };
    t.spend += r.spend; t.clicks += r.clicks; t.impressions += r.impressions; t.conversions += r.conversions; t.views += r.views; t.rows += 1;
    map.set(r.date, t);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, t]) => ({
      date,
      spend: +t.spend.toFixed(2),
      clicks: t.clicks,
      impressions: t.impressions,
      conversions: t.conversions,
      views: t.views,
      ctr: +gaDerive(t).ctr.toFixed(2),
      cpc: +gaDerive(t).cpc.toFixed(2),
    }));
}

export interface GAdsCampaignStat {
  campaign: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  views: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

// Aggregate per campaign, sorted by spend desc.
export function gaByCampaign(rows: GAdsRow[]): GAdsCampaignStat[] {
  const map = new Map<string, GAdsTotals>();
  for (const r of rows) {
    const t = map.get(r.campaign) ?? { spend: 0, clicks: 0, impressions: 0, conversions: 0, views: 0, rows: 0 };
    t.spend += r.spend; t.clicks += r.clicks; t.impressions += r.impressions; t.conversions += r.conversions; t.views += r.views; t.rows += 1;
    map.set(r.campaign, t);
  }
  return [...map.entries()]
    .map(([campaign, t]) => {
      const der = gaDerive(t);
      return { campaign, spend: t.spend, clicks: t.clicks, impressions: t.impressions, conversions: t.conversions, views: t.views, ctr: der.ctr, cpc: der.cpc, cpm: der.cpm };
    })
    .sort((a, b) => b.spend - a.spend);
}

// Search terms sorted by impressions desc (already aggregated by the route).
export function gaTerms(terms: GAdsTermRow[]) {
  return [...terms]
    .map((t) => ({ ...t, ctr: div(t.clicks, t.impressions) * 100, cpc: div(t.spend, t.clicks) }))
    .sort((a, b) => b.impressions - a.impressions);
}
