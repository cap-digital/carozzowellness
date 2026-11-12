// Meta Marketing API (Graph) source for the Meta layer — server only.
//
// Replaces the Sheet → Apps Script → Supabase chain. It emits EXACTLY the rows
// the sheet used to (same columns, same names: the sheet's connector named each
// column `<api field>_<action_type with dots → underscores>`), so everything
// downstream — encodeMeta, the compact wire format, every page — is untouched.
//
// Scope mirrors the sheet: every campaign whose name contains META_CAMPAIGN_FILTER,
// at ad × age × gender × day granularity, from the earliest of those campaigns'
// start dates through today (account timezone). Nothing is hard-coded to a date.

import type { MetaRow } from "./types";

const VERSION = process.env.META_API_VERSION || "v24.0";
const GRAPH = `https://graph.facebook.com/${VERSION}`;
const TOKEN = () => process.env.META_ACCESS_TOKEN as string;
const ACCOUNT = () => process.env.META_AD_ACCOUNT_ID || "act_519621976341845";
const FILTER = () => process.env.META_CAMPAIGN_FILTER || "[ID3] [CAROZZO WELLNESS]";

export const metaApiConfigured = () => !!process.env.META_ACCESS_TOKEN;

const CHUNK_DAYS = 7; // one request window — keeps each paged pull small
const CONCURRENCY = 9; // windows fetched in parallel
const PAGE_LIMIT = 500;

// Sheet column ← where it lives in the API response.
const ACTION_COLS: Record<string, string> = {
  actions_link_click: "link_click",
  actions_post_engagement: "post_engagement",
  actions_video_view: "video_view",
  actions_onsite_conversion_messaging_conversation_started_7d: "onsite_conversion.messaging_conversation_started_7d",
  actions_onsite_conversion_lead_grouped: "onsite_conversion.lead_grouped",
  actions_offsite_conversion_fb_pixel_lead: "offsite_conversion.fb_pixel_lead",
};
const CONVERSION_COLS: Record<string, string> = {
  conversions_offsite_conversion_fb_pixel_custom_clique_botao_whatsapp: "offsite_conversion.fb_pixel_custom.clique_botao_whatsapp",
};
const VIDEO_COLS: Record<string, string> = {
  video_thruplay_watched_actions_video_view: "video_thruplay_watched_actions",
  video_p25_watched_actions_video_view: "video_p25_watched_actions",
  video_p50_watched_actions_video_view: "video_p50_watched_actions",
  video_p75_watched_actions_video_view: "video_p75_watched_actions",
  video_p100_watched_actions_video_view: "video_p100_watched_actions",
};

const FIELDS = [
  "campaign_name",
  "adset_name",
  "ad_name",
  "ad_id",
  "spend",
  "clicks",
  "impressions",
  "reach",
  "actions",
  "conversions",
  ...Object.values(VIDEO_COLS),
].join(",");

type ActionStat = { action_type: string; value: string };
type InsightRow = Record<string, string | ActionStat[] | undefined> & {
  date_start: string;
  ad_id: string;
  ad_name: string;
};

async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = path.startsWith("http") ? new URL(path) : new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (!url.searchParams.has("access_token")) url.searchParams.set("access_token", TOKEN());
  // Insights calls can transiently fail under load; one retry absorbs it.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(90_000) });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body as T;
    const err = body?.error;
    if (attempt === 0 && (res.status >= 500 || err?.is_transient)) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    throw new Error(`Meta API: ${err?.error_user_msg || err?.message || `HTTP ${res.status}`}`);
  }
}

async function paged<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const out: T[] = [];
  let page = await graph<{ data: T[]; paging?: { next?: string } }>(path, params);
  out.push(...page.data);
  while (page.paging?.next) {
    page = await graph(page.paging.next, {});
    out.push(...page.data);
  }
  return out;
}

const filtering = () =>
  JSON.stringify([{ field: "campaign.name", operator: "CONTAIN", value: FILTER() }]);

// yyyy-mm-dd "today" in the account's timezone (insights are reported in it).
function todayIn(tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Window start = earliest start date among the matching campaigns. */
async function scope(): Promise<{ since: string; until: string }> {
  const [acct, campaigns] = await Promise.all([
    graph<{ timezone_name: string }>(ACCOUNT(), { fields: "timezone_name" }),
    paged<{ start_time?: string; created_time?: string }>(`${ACCOUNT()}/campaigns`, {
      fields: "start_time,created_time",
      filtering: filtering(),
      limit: "200",
    }),
  ]);
  const tz = acct.timezone_name || "America/Sao_Paulo";
  const until = todayIn(tz);
  const starts = campaigns
    .map((c) => (c.start_time || c.created_time || "").slice(0, 10))
    .filter(Boolean)
    .sort();
  if (!starts.length) throw new Error(`Meta API: nenhuma campanha contém "${FILTER()}"`);
  return { since: starts[0] < until ? starts[0] : until, until };
}

async function insightsWindow(since: string, until: string): Promise<InsightRow[]> {
  return paged<InsightRow>(`${ACCOUNT()}/insights`, {
    level: "ad",
    breakdowns: "age,gender",
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    filtering: filtering(),
    fields: FIELDS,
    limit: String(PAGE_LIMIT),
  });
}

/** One thumbnail + Instagram permalink per ad (by ad id). */
async function creatives(): Promise<Map<string, { thumb: string; permalink: string }>> {
  const ads = await paged<{
    id: string;
    creative?: { thumbnail_url?: string; image_url?: string; instagram_permalink_url?: string };
  }>(`${ACCOUNT()}/ads`, {
    // The size modifiers must sit ON the creative expansion — passed as plain
    // query params they're ignored and every thumbnail comes back 64×64.
    fields: "creative.thumbnail_width(1080).thumbnail_height(1080){thumbnail_url,image_url,instagram_permalink_url}",
    filtering: filtering(),
    limit: "200",
  });
  return new Map(
    ads.map((a) => [
      a.id,
      {
        thumb: a.creative?.thumbnail_url || a.creative?.image_url || "",
        permalink: a.creative?.instagram_permalink_url || "",
      },
    ])
  );
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

const pick = (list: unknown, type: string): number | "" => {
  if (!Array.isArray(list)) return "";
  const hit = (list as ActionStat[]).find((a) => a.action_type === type);
  return hit ? Number(hit.value) : "";
};

/** Meta rows in the sheet's exact shape (`MetaRow`), straight from the API. */
export async function fetchMetaRows(): Promise<MetaRow[]> {
  const { since, until } = await scope();

  const windows: [string, string][] = [];
  for (let s = since; s <= until; s = addDays(s, CHUNK_DAYS)) {
    const e = addDays(s, CHUNK_DAYS - 1);
    windows.push([s, e < until ? e : until]);
  }

  const [chunks, art] = await Promise.all([
    pool(windows, CONCURRENCY, ([s, e]) => insightsWindow(s, e)),
    creatives(),
  ]);

  const rows: MetaRow[] = [];
  for (const r of chunks.flat()) {
    const creative = art.get(r.ad_id);
    const row: Record<string, unknown> = {
      date: r.date_start,
      campaign: r.campaign_name ?? "",
      adset_name: r.adset_name ?? "",
      ad_name: r.ad_name ?? "",
      age: r.age ?? "",
      gender: r.gender ?? "",
      thumbnail_url: creative?.thumb ?? "",
      instagram_permalink_url: creative?.permalink ?? "",
      spend: Number(r.spend ?? 0),
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      reach: Number(r.reach ?? 0),
    };
    for (const [col, type] of Object.entries(ACTION_COLS)) row[col] = pick(r.actions, type);
    for (const [col, type] of Object.entries(CONVERSION_COLS)) row[col] = pick(r.conversions, type);
    for (const [col, field] of Object.entries(VIDEO_COLS)) row[col] = pick(r[field], "video_view");
    rows.push(row as unknown as MetaRow);
  }
  return rows;
}
