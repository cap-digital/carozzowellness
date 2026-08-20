import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import type { GAdsChannel, GAdsResponse, GAdsRow, GAdsTermRow } from "@/lib/googleAds";

// Server-side Google Ads API integration (v25) for Carozzo Wellness.
// Channels: Search ([ID3] [SEARCH] …) and YouTube ([ID3] [YOUTUBE] …, Video).
// Credentials come from env (.env.local locally / hosting env in prod) and are
// NEVER sent to the client — only normalized metrics are returned.
const API_VERSION = "v25";
const LOOKBACK_DAYS = 120;
const CAMPAIGN_FILTER = "campaign.name LIKE '%CAROZZO WELLNESS%'";

export const revalidate = 300; // 5 min cache

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return isFinite(n) ? n : 0;
};

const channelOf = (t: string): GAdsChannel | null =>
  t === "SEARCH" ? "search" : t === "VIDEO" ? "youtube" : null;

function dateRange() {
  const end = new Date();
  const start = new Date(end.getTime() - LOOKBACK_DAYS * 864e5);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return `segments.date BETWEEN '${iso(start)}' AND '${iso(end)}'`;
}

async function accessToken(): Promise<string> {
  const oauth = new OAuth2Client({
    clientId: process.env.GOOGLE_ADS_CLIENT_ID,
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  });
  oauth.setCredentials({ refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN });
  const { token } = await oauth.getAccessToken();
  if (!token) throw new Error("Falha ao obter access token do Google");
  return token;
}

async function gaqlSearch(token: string, query: string): Promise<any[]> {
  const cust = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const mcc = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${cust}/googleAds:search`;
  const out: any[] = [];
  let pageToken: string | undefined;
  do {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN as string,
        "login-customer-id": mcc as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, pageToken }),
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.details?.[0]?.errors?.[0]?.message || err?.error?.message || `HTTP ${res.status}`;
      throw new Error(`Google Ads API: ${msg}`);
    }
    const j = await res.json();
    if (Array.isArray(j.results)) out.push(...j.results);
    pageToken = j.nextPageToken;
  } while (pageToken);
  return out;
}

export async function GET() {
  const required = [
    "GOOGLE_ADS_CLIENT_ID",
    "GOOGLE_ADS_CLIENT_SECRET",
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_REFRESH_TOKEN",
    "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
    "GOOGLE_ADS_CUSTOMER_ID",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    // Degrade gracefully so the rest of the dashboard keeps working.
    const empty: GAdsResponse = { success: false, rows: [], searchTerms: [], error: `Faltam envs: ${missing.join(", ")}` };
    return NextResponse.json(empty, { status: 200 });
  }

  try {
    const token = await accessToken();
    const range = dateRange();

    const campaignRows = await gaqlSearch(
      token,
      `SELECT campaign.name, campaign.advertising_channel_type, segments.date,
              metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions,
              metrics.video_trueview_views
       FROM campaign
       WHERE ${CAMPAIGN_FILTER} AND ${range}`
    );

    const rows: GAdsRow[] = [];
    for (const r of campaignRows) {
      const channel = channelOf(r.campaign?.advertisingChannelType);
      if (!channel) continue;
      const m = r.metrics ?? {};
      rows.push({
        date: r.segments?.date,
        channel,
        campaign: r.campaign?.name ?? "",
        spend: +(num(m.costMicros) / 1e6).toFixed(2),
        clicks: num(m.clicks),
        impressions: num(m.impressions),
        conversions: num(m.conversions),
        views: num(m.videoTrueviewViews), // v25 renamed video_views → video_trueview_views
      });
    }

    // Search terms (Search campaign only). Aggregate by term, keep the top by impressions.
    const termRows = await gaqlSearch(
      token,
      `SELECT search_term_view.search_term, metrics.impressions, metrics.clicks, metrics.cost_micros
       FROM search_term_view
       WHERE ${CAMPAIGN_FILTER} AND ${range}`
    );
    const termMap = new Map<string, GAdsTermRow>();
    for (const r of termRows) {
      const term = r.searchTermView?.searchTerm;
      if (!term) continue;
      const m = r.metrics ?? {};
      const acc = termMap.get(term) ?? { term, spend: 0, clicks: 0, impressions: 0 };
      acc.spend += num(m.costMicros) / 1e6;
      acc.clicks += num(m.clicks);
      acc.impressions += num(m.impressions);
      termMap.set(term, acc);
    }
    const searchTerms = [...termMap.values()]
      .map((t) => ({ ...t, spend: +t.spend.toFixed(2) }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 500);

    const body: GAdsResponse = { success: true, rows, searchTerms, timestamp: new Date().toISOString() };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    const body: GAdsResponse = { success: false, rows: [], searchTerms: [], error: (e as Error).message };
    return NextResponse.json(body, { status: 200 });
  }
}
