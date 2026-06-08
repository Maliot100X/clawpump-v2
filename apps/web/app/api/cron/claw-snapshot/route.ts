// GET /api/cron/claw-snapshot
// Vercel cron — fires every 5 minutes (see vercel.json crons). Writes one
// CLAW price snapshot into Neon claw_price_history so we have continuous data
// even when no one has the dashboard open.
//
// Vercel signs cron requests with the CRON_SECRET env var via the
// `Authorization: Bearer <CRON_SECRET>` header. We accept either that or
// the Vercel-internal `x-vercel-cron` header (present on official cron pings).

import { NextRequest, NextResponse } from "next/server";
import { getClawSnapshot } from "@/lib/dexscreener";
import { ensureSchema, recordClawPrice } from "@/lib/db";

export const runtime = "nodejs";

function isAuthorizedCron(req: NextRequest): boolean {
  // Vercel injects this header on official cron pings.
  if (req.headers.get("x-vercel-cron")) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // no secret configured -> reject manual calls
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    await ensureSchema();
    const snap = await getClawSnapshot();
    await recordClawPrice({
      priceUsd: snap.priceUsd,
      priceNative: snap.priceNative,
      marketCap: snap.marketCap,
      volume24h: snap.volume24h,
    });
    return NextResponse.json({
      ok: true,
      priceUsd: snap.priceUsd,
      priceNative: snap.priceNative,
      capturedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
