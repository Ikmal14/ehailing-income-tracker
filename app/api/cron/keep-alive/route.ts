import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Vercel Cron keep-alive endpoint.
 *
 * Scheduled (via vercel.json) to run every 5 days. It issues a lightweight
 * read against Supabase so the free-tier project is never idle for the full
 * 7-day window that triggers an automatic pause.
 *
 * Uses the anon client with a count-only HEAD query — equivalent to `SELECT 1`
 * in cost — and does not require any user session.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  // When CRON_SECRET is configured, Vercel Cron sends it as a Bearer token.
  // Reject any other caller so the endpoint cannot be abused.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: "missing supabase env" },
      { status: 500 }
    );
  }

  const supabase = createClient(url, key);

  // Lightweight ping: count-only HEAD request against a known table.
  const { error } = await supabase
    .from("shifts")
    .select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    pinged_at: new Date().toISOString(),
  });
}
