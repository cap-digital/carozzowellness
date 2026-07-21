import { MetaRow, Row, Totals } from "./types";

// ---- coercion --------------------------------------------------------------
export const num = (v: unknown): number => {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (v == null || v === "") return 0;
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
};

const div = (a: number, b: number) => (b > 0 ? a / b : 0);

// ---- parsing dimensions from the naming convention -------------------------
const brackets = (s: string) => (s.match(/\[([^\]]+)\]/g) || []).map((b) => b.slice(1, -1).trim());

export function parseObjective(campaign: string): string {
  const b = brackets(campaign);
  return b.length ? b[b.length - 1] : campaign;
}

export function parsePlacement(adset: string): string {
  const m = adset.match(/IG\s*-\s*([A-Za-zÀ-ú]+)/i);
  if (!m) return "Outro";
  const p = m[1].toLowerCase();
  if (p.startsWith("feed")) return "Feed";
  if (p.startsWith("vert")) return "Stories/Reels";
  if (p.startsWith("aut")) return "Automático";
  return m[1];
}

export function parseFormat(ad: string): string {
  const raw = ad.split(" - ").slice(1).join(" - ").trim();
  const s = raw.toLowerCase();
  if (s.includes("carrossel")) return "Carrossel";
  if (s.includes("30")) return 'Animação 30"';
  if (s.includes("15")) return 'Animação 15"';
  if (s.includes("anima")) return "Animação";
  if (s.includes("estat") || s.includes("estát")) return "Estático";
  return "Outro";
}

// ---- normalize -------------------------------------------------------------
export function normalize(r: MetaRow): Row {
  const leads =
    num(r.actions_lead) +
    num(r.actions_offsite_conversion_fb_pixel_lead) +
    num(r.actions_onsite_conversion_lead_grouped);
  return {
    date: String(r.date).slice(0, 10),
    campaign: r.campaign,
    objective: parseObjective(r.campaign),
    adset: r.adset_name,
    placement: parsePlacement(r.adset_name),
    ad: r.ad_name,
    format: parseFormat(r.ad_name),
    thumb: r.thumbnail_url || "",
    permalink: r.instagram_permalink_url || "",
    age: r.age || "Unknown",
    gender: r.gender || "unknown",
    spend: num(r.spend),
    clicks: num(r.clicks),
    linkClicks: num(r.actions_link_click),
    impressions: num(r.impressions),
    reach: num(r.reach),
    engagement: num(r.actions_post_engagement),
    videoViews: num(r.actions_video_view),
    thruplays: num(r.video_thruplay_watched_actions_video_view),
    p25: num(r.video_p25_watched_actions_video_view),
    p50: num(r.video_p50_watched_actions_video_view),
    p75: num(r.video_p75_watched_actions_video_view),
    p100: num(r.video_p100_watched_actions_video_view),
    whatsapp: num(r.conversions_offsite_conversion_fb_pixel_custom_clique_botao_whatsapp),
    conversations: num(r.actions_onsite_conversion_messaging_conversation_started_7d),
    leads,
  };
}

// ---- totals ----------------------------------------------------------------
export function emptyTotals(): Totals {
  return {
    spend: 0, clicks: 0, linkClicks: 0, impressions: 0, reach: 0, engagement: 0,
    videoViews: 0, thruplays: 0, p25: 0, p50: 0, p75: 0, p100: 0,
    whatsapp: 0, conversations: 0, leads: 0, rows: 0,
  };
}

export function sum(rows: Row[]): Totals {
  const t = emptyTotals();
  for (const r of rows) {
    t.spend += r.spend; t.clicks += r.clicks; t.linkClicks += r.linkClicks;
    t.impressions += r.impressions; t.reach += r.reach; t.engagement += r.engagement;
    t.videoViews += r.videoViews; t.thruplays += r.thruplays;
    t.p25 += r.p25; t.p50 += r.p50; t.p75 += r.p75; t.p100 += r.p100;
    t.whatsapp += r.whatsapp; t.conversations += r.conversations; t.leads += r.leads;
    t.rows += 1;
  }
  return t;
}

// ---- derived rates & costs (the "custos e taxas") --------------------------
export interface Derived {
  cpm: number;
  cpc: number;
  cpcLink: number;
  ctr: number;
  ctrLink: number;
  frequency: number;
  engagementRate: number; // vs reach
  cpl: number; // custo por lead
  cpConversation: number; // custo por conversa
  cpWhatsapp: number; // custo por clique no WhatsApp
  cpv: number; // custo por video view
  vtr: number; // thruplay rate vs impressions
  hookRate: number; // p25 / impressions
  retention: number; // p100 / p25
  totalConversions: number; // whatsapp + conversations + leads
  costPerConversion: number;
  conversionRate: number; // conversions / linkClicks
}

export function derive(t: Totals): Derived {
  const totalConversions = t.whatsapp + t.conversations + t.leads;
  return {
    cpm: div(t.spend, t.impressions) * 1000,
    cpc: div(t.spend, t.clicks),
    cpcLink: div(t.spend, t.linkClicks),
    ctr: div(t.clicks, t.impressions) * 100,
    ctrLink: div(t.linkClicks, t.impressions) * 100,
    frequency: div(t.impressions, t.reach),
    engagementRate: div(t.engagement, t.reach) * 100,
    cpl: div(t.spend, t.leads),
    cpConversation: div(t.spend, t.conversations),
    cpWhatsapp: div(t.spend, t.whatsapp),
    cpv: div(t.spend, t.videoViews),
    vtr: div(t.thruplays, t.impressions) * 100,
    hookRate: div(t.p25, t.impressions) * 100,
    retention: div(t.p100, t.p25) * 100,
    totalConversions,
    costPerConversion: div(t.spend, totalConversions),
    conversionRate: div(totalConversions, t.linkClicks) * 100,
  };
}

// ---- cost & fee model ------------------------------------------------------
export interface FeeConfig {
  feePct: number; // taxa de gestão / agência
  taxPct: number; // impostos sobre a mídia
}

export interface CostBreakdown {
  media: number;
  fee: number;
  tax: number;
  total: number;
  effectiveCpl: number;
  effectiveCpConversion: number;
  effectiveCpm: number;
}

export function computeCosts(t: Totals, cfg: FeeConfig): CostBreakdown {
  const media = t.spend;
  const fee = media * (cfg.feePct / 100);
  const tax = (media + fee) * (cfg.taxPct / 100);
  const total = media + fee + tax;
  const conversions = t.whatsapp + t.conversations + t.leads;
  return {
    media,
    fee,
    tax,
    total,
    effectiveCpl: div(total, t.leads),
    effectiveCpConversion: div(total, conversions),
    effectiveCpm: div(total, t.impressions) * 1000,
  };
}

// ---- grouping helpers ------------------------------------------------------
export function groupSum<T extends string | number>(
  rows: Row[],
  key: (r: Row) => T
): { key: T; totals: Totals; rows: Row[] }[] {
  const map = new Map<T, Row[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = map.get(k);
    if (arr) arr.push(r);
    else map.set(k, [r]);
  }
  return [...map.entries()].map(([k, rs]) => ({ key: k, totals: sum(rs), rows: rs }));
}

export const byDate = (rows: Row[]) =>
  groupSum(rows, (r) => r.date).sort((a, b) => a.key.localeCompare(b.key));

export const uniqueDates = (rows: Row[]) =>
  [...new Set(rows.map((r) => r.date))].sort();
