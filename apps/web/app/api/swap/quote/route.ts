// POST /api/swap/quote — pure price quote, no tx build. Useful for live
// "you'll get ~X" previews in the UI as the user types an amount.

import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { quoteSwap } from "@/lib/meteora";

export const runtime = "nodejs";

interface QuoteBody {
  pool?: string;
  amountIn?: string;
  swapBaseForQuote?: boolean;
  slippageBps?: number;
}

export async function POST(req: NextRequest) {
  let body: QuoteBody;
  try {
    body = (await req.json()) as QuoteBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { pool, amountIn, swapBaseForQuote, slippageBps } = body;
  if (!pool || !amountIn || swapBaseForQuote === undefined) {
    return NextResponse.json(
      { error: "pool, amountIn (string), swapBaseForQuote required" },
      { status: 400 },
    );
  }

  let poolKey: PublicKey;
  try {
    poolKey = new PublicKey(pool);
  } catch {
    return NextResponse.json({ error: "invalid pool pubkey" }, { status: 400 });
  }

  let amountInBig: bigint;
  try {
    amountInBig = BigInt(amountIn);
    if (amountInBig <= 0n) throw new Error("amountIn must be positive");
  } catch (e) {
    return NextResponse.json(
      {
        error: `amountIn must be a positive integer string (atomic units): ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 400 },
    );
  }

  try {
    const quote = await quoteSwap({
      pool: poolKey,
      amountIn: amountInBig,
      swapBaseForQuote,
      slippageBps: slippageBps ?? 100,
    });
    return NextResponse.json(quote);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `quote failed: ${msg}` },
      { status: 502 },
    );
  }
}
