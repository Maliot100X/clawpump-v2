// GET /api/stats — global launchpad stats (clawpump.tech /api/stats + live CLAW header).

import { NextResponse } from "next/server";
import { getStats } from "@/lib/clawpump";
import { getClawSnapshot } from "@/lib/dexscreener";
import { buildCurve } from "@/lib/curve";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const [stats, snap] = await Promise.all([
    getStats(),
    getClawSnapshot().catch(() => null),
  ]);
  const curve = snap ? buildCurve(snap.priceNative) : null;
  return NextResponse.json({
    platform: stats,
    claw: snap && {
      priceUsd: snap.priceUsd,
      priceNative: snap.priceNative,
      marketCap: snap.marketCap,
      volume24h: snap.volume24h,
      priceChange24h: snap.priceChange24h,
    },
    curveConstants: curve && {
      graduationClaw: curve.graduationClaw,
      graduationUsd: snap ? curve.graduationClaw * snap.priceUsd : 0,
      virtualClawReserves: curve.virtualClawReserves,
    },
    fetchedAt: Date.now(),
  });
}
