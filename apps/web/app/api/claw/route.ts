// GET /api/claw — live CLAW price + graduation threshold
// Used by the header ticker and the curve UI.

import { NextResponse } from "next/server";
import { getClawSnapshot, CLAW_MINT } from "@/lib/dexscreener";
import { buildCurve } from "@/lib/curve";
import { recordClawPrice } from "@/lib/db";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  try {
    const snap = await getClawSnapshot();
    // priceNative on a CLAW/SOL pair is CLAW priced in SOL.
    const curve = buildCurve(snap.priceNative);
    // Fire-and-forget price log (don't await — never block the response).
    recordClawPrice({
      priceUsd: snap.priceUsd,
      priceNative: snap.priceNative,
      marketCap: snap.marketCap,
      volume24h: snap.volume24h,
    }).catch(() => {});
    return NextResponse.json({
      mint: CLAW_MINT,
      symbol: snap.symbol,
      priceUsd: snap.priceUsd,
      priceNative: snap.priceNative,
      quoteSymbol: snap.quoteSymbol,
      marketCap: snap.marketCap,
      fdv: snap.fdv,
      liquidityUsd: snap.liquidityUsd,
      volume24h: snap.volume24h,
      priceChange24h: snap.priceChange24h,
      txns24h: snap.txns24h,
      pairAddress: snap.pairAddress,
      dexId: snap.dexId,
      dexUrl: snap.url,
      curve: {
        graduationClaw: curve.graduationClaw,
        graduationUsd: curve.graduationClaw * snap.priceUsd,
        virtualClawReserves: curve.virtualClawReserves,
        virtualTokenReserves: curve.virtualTokenReserves,
        realTokenReserves: curve.realTokenReserves,
        priceClawInSol: curve.priceClawInSol,
      },
      fetchedAt: snap.fetchedAt,
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 502 },
    );
  }
}
