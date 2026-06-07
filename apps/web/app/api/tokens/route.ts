// GET /api/tokens?sort=hot|new|graduated|volume&limit=20&agentId=…
// Proxies clawpump.tech /api/tokens and enriches with Dexscreener prices.

import { NextRequest, NextResponse } from "next/server";
import { listTokens } from "@/lib/clawpump";
import { getMultiSnapshot } from "@/lib/dexscreener";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sort = (sp.get("sort") as "hot" | "new" | "graduated" | "volume" | null) ?? "hot";
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 25)));
  const agentId = sp.get("agentId") ?? undefined;

  const tokens = await listTokens({ sort, limit, agentId });
  if (tokens.length === 0) {
    return NextResponse.json({ tokens: [], enriched: false });
  }

  // Enrich graduated tokens with live DEX data; pre-graduation tokens may not
  // have a Dexscreener pair yet, so we silently drop the enrichment for them.
  const graduatedMints = tokens
    .filter((t) => t.graduated && t.mint)
    .map((t) => t.mint);
  let priceByMint = new Map<
    string,
    { priceUsd: number; volume24h: number; marketCap: number; priceChange24h: number }
  >();
  if (graduatedMints.length > 0) {
    try {
      const snaps = await getMultiSnapshot(graduatedMints);
      priceByMint = new Map(
        snaps.map((s) => [
          s.mint,
          {
            priceUsd: s.priceUsd,
            volume24h: s.volume24h,
            marketCap: s.marketCap,
            priceChange24h: s.priceChange24h,
          },
        ]),
      );
    } catch {
      /* dexscreener miss — non-fatal */
    }
  }

  const enriched = tokens.map((t) => {
    const live = t.mint ? priceByMint.get(t.mint) : undefined;
    return live ? { ...t, ...live, live: true } : t;
  });

  return NextResponse.json({ tokens: enriched, enriched: priceByMint.size > 0 });
}
