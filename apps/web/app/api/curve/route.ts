// POST /api/curve — preview a bonding-curve quote at current CLAW price.
// body: { clawIn?: number, tokensIn?: number, vClaw?: number, vTok?: number }
// If vClaw/vTok omitted, we use t=0 reserves derived from live CLAW price.

import { NextRequest, NextResponse } from "next/server";
import { getClawSnapshot } from "@/lib/dexscreener";
import { buildCurve, tokensOut, clawOut, spotPrice } from "@/lib/curve";

export const runtime = "nodejs";

interface QuoteBody {
  clawIn?: number;
  tokensIn?: number;
  vClaw?: number;
  vTok?: number;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as QuoteBody;
  const snap = await getClawSnapshot();
  const curve = buildCurve(snap.priceNative);
  const vClaw = body.vClaw ?? curve.virtualClawReserves;
  const vTok = body.vTok ?? curve.virtualTokenReserves;

  const out: Record<string, unknown> = {
    spotClawPerToken: spotPrice(vClaw, vTok),
    spotUsdPerToken: spotPrice(vClaw, vTok) * snap.priceUsd,
    graduationClaw: curve.graduationClaw,
    graduationUsd: curve.graduationClaw * snap.priceUsd,
    priceClawInSol: snap.priceNative,
    priceClawInUsd: snap.priceUsd,
  };
  if (typeof body.clawIn === "number" && body.clawIn > 0) {
    out.buy = tokensOut(vClaw, vTok, body.clawIn);
  }
  if (typeof body.tokensIn === "number" && body.tokensIn > 0) {
    out.sell = clawOut(vClaw, vTok, body.tokensIn);
  }
  return NextResponse.json(out);
}
