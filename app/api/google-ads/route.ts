import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import type { GAdsChannel, GAdsCreative, GAdsResponse, GAdsRetention, GAdsRow, GAdsTermRow } from "@/lib/googleAds";

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

    // The four queries are independent — run them in parallel to cut latency.
    const [campaignRows, termRows, retRows, adRows] = await Promise.all([
      gaqlSearch(
        token,
        `SELECT campaign.name, campaign.advertising_channel_type, segments.date,
                metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions,
                metrics.video_trueview_views
         FROM campaign
         WHERE ${CAMPAIGN_FILTER} AND ${range}`
      ),
      gaqlSearch(
        token,
        `SELECT search_term_view.search_term, metrics.impressions, metrics.clicks, metrics.cost_micros
         FROM search_term_view
         WHERE ${CAMPAIGN_FILTER} AND ${range}`
      ),
      gaqlSearch(
        token,
        `SELECT metrics.video_quartile_p25_rate, metrics.video_quartile_p50_rate,
                metrics.video_quartile_p75_rate, metrics.video_quartile_p100_rate
         FROM campaign
         WHERE ${CAMPAIGN_FILTER} AND campaign.advertising_channel_type = 'VIDEO' AND ${range}`
      ),
      gaqlSearch(
        token,
        `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.video_responsive_ad.videos,
                metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.video_trueview_views
         FROM ad_group_ad
         WHERE ${CAMPAIGN_FILTER} AND campaign.advertising_channel_type = 'VIDEO' AND ${range}`
      ),
    ]);

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

    // YouTube video retention (quartile completion rates, aggregated over the window).
    const rmet = retRows[0]?.metrics;
    const videoRetention: GAdsRetention | null = rmet
      ? {
          p25: +(num(rmet.videoQuartileP25Rate) * 100).toFixed(1),
          p50: +(num(rmet.videoQuartileP50Rate) * 100).toFixed(1),
          p75: +(num(rmet.videoQuartileP75Rate) * 100).toFixed(1),
          p100: +(num(rmet.videoQuartileP100Rate) * 100).toFixed(1),
        }
      : null;

    // YouTube video creatives (ad-level) + resolve the YouTube video id for thumbnails.
    const assetRes = new Set<string>();
    for (const r of adRows)
      for (const v of r.adGroupAd?.ad?.videoResponsiveAd?.videos ?? []) if (v.asset) assetRes.add(v.asset);
    const assetMap = new Map<string, { youtubeVideoId?: string; youtubeVideoTitle?: string }>();
    if (assetRes.size) {
      const ids = [...assetRes].map((rn) => rn.split("/").pop()).filter(Boolean);
      const assetRows = await gaqlSearch(
        token,
        `SELECT asset.resource_name, asset.youtube_video_asset.youtube_video_id,
                asset.youtube_video_asset.youtube_video_title
         FROM asset WHERE asset.id IN (${ids.join(",")})`
      );
      for (const a of assetRows) if (a.asset?.resourceName) assetMap.set(a.asset.resourceName, a.asset.youtubeVideoAsset ?? {});
    }
    const youtubeCreatives: GAdsCreative[] = adRows
      .map((r) => {
        const ad = r.adGroupAd?.ad ?? {};
        const m = r.metrics ?? {};
        const vid = (ad.videoResponsiveAd?.videos ?? []).map((v: any) => assetMap.get(v.asset)).find(Boolean);
        const videoId = vid?.youtubeVideoId ?? "";
        return {
          ad: vid?.youtubeVideoTitle || ad.name || "Vídeo",
          videoId,
          thumb: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "",
          permalink: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "",
          spend: +(num(m.costMicros) / 1e6).toFixed(2),
          clicks: num(m.clicks),
          impressions: num(m.impressions),
          views: num(m.videoTrueviewViews),
        };
      })
      .sort((a, b) => b.spend - a.spend);

    const body: GAdsResponse = { success: true, rows, searchTerms, videoRetention, youtubeCreatives, timestamp: new Date().toISOString() };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    const body: GAdsResponse = { success: false, rows: [], searchTerms: [], error: (e as Error).message };
    return NextResponse.json(body, { status: 200 });
  }
}
