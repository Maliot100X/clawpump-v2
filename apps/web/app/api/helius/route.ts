// GET /api/helius?wallet=<addr>  — recent signature count for a wallet (real, no demo).

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;

const HELIUS_RPC =
  process.env.HELIUS_RPC ||
  (process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : "https://api.mainnet-beta.solana.com");

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }
  try {
    const res = await fetch(HELIUS_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method: "getSignaturesForAddress",
        params: [wallet, { limit: 50 }],
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `rpc ${res.status}` },
        { status: 502 },
      );
    }
    const j = await res.json();
    const sigs = j?.result ?? [];
    const now = Date.now() / 1000;
    const last24h = sigs.filter(
      (s: { blockTime?: number }) =>
        typeof s.blockTime === "number" && now - s.blockTime < 86_400,
    ).length;
    return NextResponse.json({
      wallet,
      recentSignatures: sigs.length,
      signatures24h: last24h,
      source: "helius",
    });
  } catch (e) {
    return NextResponse.json(
      { wallet, error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
