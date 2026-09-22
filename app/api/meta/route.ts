import { NextResponse } from "next/server";
import { revalidateTag, unstable_cache } from "next/cache";
import type { ApiResponse } from "@/lib/types";
import { encodeMeta, type MetaCompact } from "@/lib/compact";

// Server-side proxy to the Carozzo Wellness Supabase edge function.
//
// Two upstream problems this route exists to absorb:
//  1. Size — upstream returns ~26 MB, well past Vercel's 4.5 MB response limit,
//     which is exactly what surfaced as "HTTP 502" on the dashboard. We
//     dictionary-encode it down to ~1 MB before it ever leaves this function.
//  2. Latency — the edge function answers in anywhere from 30s to 150s. The
//     caches below keep visitors from waiting on it, but SOMEONE has to wait
//     for the fill — and after a deploy (CDN purged) that's the first visitor.
const ENDPOINT = "https://cqrpbiepyeypbkizwacu.supabase.co/functions/v1/CarozzoWellness";
const KEY = "sb_publishable_YN9YKLw6sludrgf9T2i_1g_Dcm8dIiK";

// Upstream has been measured at up to 150s. With a 60s cap a slow day means the
// cache can never be filled at all (seen in prod right after a deploy), so give
// the fill room to finish. 300s is the Fluid Compute ceiling on every plan.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 280_000; // leave room inside maxDuration to encode + reply
const TTL_SECONDS = 900; // 15 min
const MEMORY_STALE_MS = 24 * 60 * 60_000; // last-resort fallback window

// Layer 1 — warm lambda memory. Also the safety net when upstream is having a
// 150s day: a stale dashboard beats an error screen.
let memo: { at: number; body: MetaCompact } | null = null;
let inflight: Promise<MetaCompact> | null = null;

async function fetchUpstream(): Promise<MetaCompact> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      apikey: KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "Functions" }),
    cache: "no-store", // 26 MB is far past the Data Cache entry limit
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);

  const data = (await res.json()) as ApiResponse | UpstreamCompact;
  if (!data?.success) throw new Error("Resposta sem sucesso");

  // The Apps Script (scripts/apps-script/Code.gs) now ships the compact format
  // itself, pre-built on a timer. Older deployments still send raw rows, so
  // both shapes are accepted and the switch-over needs no coordination.
  if ("dict" in data && Array.isArray(data.rows)) {
    const prog = data.programatica;
    return {
      success: true,
      dict: data.dict,
      rows: data.rows,
      programatica: Array.isArray(prog) ? prog.length : Number(prog) || 0,
      timestamp: data.timestamp ?? new Date().toISOString(),
    };
  }
  if (!("meta" in data) || !Array.isArray(data.meta)) throw new Error("Resposta sem sucesso");
  return encodeMeta(data.meta, data.timestamp ?? new Date().toISOString(), data.programatica?.length ?? 0);
}

// Shape emitted by the Apps Script's compact mode (format "compact-v1").
type UpstreamCompact = Omit<MetaCompact, "programatica"> & { format?: string; programatica: unknown[] | number };

// Layer 2 — Vercel's Data Cache, shared across lambdas, regions and deploys, so
// a cold start doesn't mean another 30s+ round trip. The RAW response is way too
// big to cache, but the ENCODED payload (~1 MB) fits the 2 MB entry limit.
const CACHE_TAG = "carozzo-meta";
const cachedUpstream = unstable_cache(fetchUpstream, ["carozzo-meta-v1"], {
  revalidate: TTL_SECONDS,
  tags: [CACHE_TAG],
});

// Collapse concurrent misses onto one upstream call instead of N × 30s.
function load(force: boolean): Promise<MetaCompact> {
  if (!inflight) {
    // A forced refresh drops the shared entry first, so the same round trip
    // that answers this request also repopulates the cache for everyone else.
    if (force) revalidateTag(CACHE_TAG);
    inflight = cachedUpstream()
      .then((body) => {
        memo = { at: Date.now(), body };
        return body;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

const send = (body: MetaCompact, sMaxAge: number | null) =>
  NextResponse.json(body, {
    headers: {
      // Layer 3 — the CDN. `stale-while-revalidate` is the important half: once
      // an entry exists, visitors get it instantly while the refresh happens in
      // the background, so upstream latency stops being user-visible entirely.
      "Cache-Control":
        sMaxAge === null
          ? "no-store"
          : `public, s-maxage=${sMaxAge}, stale-while-revalidate=86400`,
    },
  });

export async function GET(request: Request) {
  // `?refresh=1` is the "Atualizar" button: skip every cache and pay the round
  // trip. Plain page loads always take the cached path.
  const force = new URL(request.url).searchParams.has("refresh");
  const age = memo ? Date.now() - memo.at : Infinity;

  if (!force && memo && age < TTL_SECONDS * 1000) return send(memo.body, TTL_SECONDS);

  try {
    return send(await load(force), force ? null : TTL_SECONDS);
  } catch (e) {
    // Upstream timed out or errored. Serve whatever we last had.
    if (memo && age < MEMORY_STALE_MS) return send(memo.body, 60);
    const body: MetaCompact = {
      success: false,
      dict: { dates: [], campaigns: [], adsets: [], ads: [], ages: [], genders: [] },
      rows: [],
      programatica: 0,
      timestamp: new Date().toISOString(),
      error:
        (e as Error).name === "TimeoutError"
          ? "A fonte de dados demorou demais para responder. Tente novamente em instantes."
          : (e as Error).message,
    };
    return NextResponse.json(body, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
