import { NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/types";

// Server-side proxy to the Carozzo Wellness Supabase edge function.
// Keeps the key off the client bundle and lets us cache the payload.
const ENDPOINT = "https://cqrpbiepyeypbkizwacu.supabase.co/functions/v1/CarozzoWellness";
const KEY = "sb_publishable_YN9YKLw6sludrgf9T2i_1g_Dcm8dIiK";

export const revalidate = 300; // 5 min ISR-style cache

export async function GET() {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        apikey: KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Functions" }),
      // Payload is ~2.1MB — above Next's Data Cache limit; cache the route
      // render (revalidate above) + browser via Cache-Control instead.
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Upstream ${res.status}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as ApiResponse;
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
