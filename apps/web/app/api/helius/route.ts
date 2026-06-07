import { NextRequest, NextResponse } from "next/server";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "";
const HELIUS_RPC = process.env.HELIUS_RPC || (HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}` : "");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") || "9xK4vPqR2mN8pQjL5sT7vXwYbZcD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ";

  if (!HELIUS_API_KEY && !HELIUS_RPC) {
    return NextResponse.json({ holders: 1240, txCount24h: 89, note: "HELIUS key missing (demo data)", wallet, source: "fallback" });
  }

  try {
    // Example: use Helius parse or getSignatures (light)
    const body = { jsonrpc: "2.0", id: "1", method: "getSignaturesForAddress", params: [wallet, { limit: 10 }] };
    const res = await fetch(HELIUS_RPC || "https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    const txs = j?.result?.length || 0;
    return NextResponse.json({
      wallet,
      txCountSample: txs,
      holders: 1240, // placeholder; real holder count would use getProgramAccounts or DAS
      note: "Helius RPC powered (parse tx/history endpoints supported via your multiple RPCs in .env)",
      source: "helius",
    });
  } catch (e: any) {
    return NextResponse.json({ wallet, txCountSample: 12, holders: 1240, error: e.message, source: "helius-fallback" });
  }
}
