// Compact wire format for the Meta layer.
//
// The upstream Supabase function returns ~26 MB of raw rows — far above Vercel's
// 4.5 MB serverless response limit (which is what produced the HTTP 502) and a
// heavy parse on the client. The dimensions are tiny though (6 campaigns,
// 14 adsets, 18 ads, ~75 dates), and `thumbnail_url` alone is 11 MB because the
// Facebook CDN re-signs the same image on every row.
//
// So the route dictionary-encodes: strings move to lookup tables, creatives keep
// ONE thumb/permalink per ad, and each row becomes a flat array of indices +
// numbers. Same information, ~1.2 MB instead of 26 MB.

import type { MetaRow, Row } from "./types";
import { parseObjective, parsePlacement, parseFormat, num } from "./metrics";

export interface CompactAd {
  n: string; // ad name
  t: string; // thumbnail url
  p: string; // instagram permalink
}

export interface CompactDict {
  dates: string[];
  campaigns: string[];
  adsets: string[];
  ads: CompactAd[];
  ages: string[];
  genders: string[];
}

/** [date, campaign, adset, ad, age, gender] indices + METRIC_FIELDS values. */
export type CompactRow = number[];

export interface MetaCompact {
  success: boolean;
  dict: CompactDict;
  rows: CompactRow[];
  programatica: number; // upstream row count (layer still unused by the UI)
  timestamp: string;
  error?: string;
}

export const DIM_COUNT = 6;

// Source field per numeric column, in wire order. Keep encode/expand in sync.
export const METRIC_FIELDS: (keyof MetaRow)[] = [
  "spend",
  "clicks",
  "actions_link_click",
  "impressions",
  "reach",
  "actions_post_engagement",
  "actions_video_view",
  "video_thruplay_watched_actions_video_view",
  "video_p25_watched_actions_video_view",
  "video_p50_watched_actions_video_view",
  "video_p75_watched_actions_video_view",
  "video_p100_watched_actions_video_view",
  "conversions_offsite_conversion_fb_pixel_custom_clique_botao_whatsapp",
  "actions_onsite_conversion_messaging_conversation_started_7d",
  "actions_onsite_conversion_lead_grouped",
  "actions_offsite_conversion_fb_pixel_lead",
  "actions_lead",
];

// The sheet behind the edge function has shipped dates as ISO timestamps
// ("2026-07-11T03:00:00.000Z") and as pt-BR ("11/07/2026"). Accept both — and
// anything else degrades to "" so `isValidDate` filters it out of time series.
export function toIsoDate(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/); // dd/mm/yyyy
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  const t = Date.parse(s);
  return isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10);
}

// ---- encode (server) -------------------------------------------------------
export function encodeMeta(raw: MetaRow[], timestamp: string, programatica = 0): MetaCompact {
  const dates: string[] = [];
  const campaigns: string[] = [];
  const adsets: string[] = [];
  const adNames: string[] = [];
  const ages: string[] = [];
  const genders: string[] = [];
  const index = new Map<string, number>();
  const intern = (bucket: string[], tag: string, value: string) => {
    const k = `${tag}\u0000${value}`;
    let i = index.get(k);
    if (i === undefined) {
      i = bucket.length;
      bucket.push(value);
      index.set(k, i);
    }
    return i;
  };

  // One creative per ad: the CDN signature churns per row, the image doesn't.
  const thumbs = new Map<string, string>();
  const perms = new Map<string, string>();
  const rows: CompactRow[] = [];

  for (const r of raw) {
    const ad = r.ad_name ?? "";
    if (r.thumbnail_url && !thumbs.has(ad)) thumbs.set(ad, r.thumbnail_url);
    if (r.instagram_permalink_url && !perms.has(ad)) perms.set(ad, r.instagram_permalink_url);

    const row: CompactRow = [
      intern(dates, "d", toIsoDate(r.date)),
      intern(campaigns, "c", r.campaign ?? ""),
      intern(adsets, "s", r.adset_name ?? ""),
      intern(adNames, "a", ad),
      intern(ages, "g", r.age || "Unknown"),
      intern(genders, "n", r.gender || "unknown"),
    ];
    for (const f of METRIC_FIELDS) {
      const n = num(r[f]);
      // 4 decimals matches the source's finest spend precision, so totals stay
      // exact to the cent, while trimming float noise off the wire.
      row.push(n === 0 ? 0 : Math.round(n * 1e4) / 1e4);
    }
    rows.push(row);
  }

  return {
    success: true,
    dict: {
      dates,
      campaigns,
      adsets,
      ads: adNames.map((n) => ({ n, t: thumbs.get(n) ?? "", p: perms.get(n) ?? "" })),
      ages,
      genders,
    },
    rows,
    programatica,
    timestamp,
  };
}

// ---- expand (client) -------------------------------------------------------
// Name parsing (objective / placement / format) runs once per dictionary entry
// instead of once per row — 38 calls instead of ~52k.
export function expandMeta(c: MetaCompact): Row[] {
  const d = c.dict;
  if (!d || !Array.isArray(c.rows)) return [];

  const objectives = d.campaigns.map(parseObjective);
  const placements = d.adsets.map(parsePlacement);
  const formats = d.ads.map((a) => parseFormat(a.n));
  const at = (i: number) => DIM_COUNT + i;

  const out: Row[] = new Array(c.rows.length);
  for (let i = 0; i < c.rows.length; i++) {
    const r = c.rows[i];
    const ci = r[1];
    const si = r[2];
    const ai = r[3];
    const ad = d.ads[ai] ?? { n: "", t: "", p: "" };
    const leadGrouped = r[at(14)] ?? 0;
    const leadSite = r[at(15)] ?? 0;
    out[i] = {
      date: d.dates[r[0]] ?? "",
      campaign: d.campaigns[ci] ?? "",
      objective: objectives[ci] ?? "",
      adset: d.adsets[si] ?? "",
      placement: placements[si] ?? "Outro",
      ad: ad.n,
      format: formats[ai] ?? "Outro",
      thumb: ad.t,
      permalink: ad.p,
      age: d.ages[r[4]] ?? "Unknown",
      gender: d.genders[r[5]] ?? "unknown",
      spend: r[at(0)] ?? 0,
      clicks: r[at(1)] ?? 0,
      linkClicks: r[at(2)] ?? 0,
      impressions: r[at(3)] ?? 0,
      reach: r[at(4)] ?? 0,
      engagement: r[at(5)] ?? 0,
      videoViews: r[at(6)] ?? 0,
      thruplays: r[at(7)] ?? 0,
      p25: r[at(8)] ?? 0,
      p50: r[at(9)] ?? 0,
      p75: r[at(10)] ?? 0,
      p100: r[at(11)] ?? 0,
      whatsapp: r[at(12)] ?? 0,
      conversations: r[at(13)] ?? 0,
      leads: (r[at(16)] ?? 0) + leadSite + leadGrouped,
      leadGrouped,
      leadSite,
    };
  }
  return out;
}
