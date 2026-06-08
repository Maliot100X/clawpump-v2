// POST /api/swap — build an exact-in swap transaction against a DBC pool.
//
// Body:
//   { pool, userWallet, amountIn, swapBaseForQuote, slippageBps? }
//
//   - pool             pubkey of the DBC pool (returned by /api/launch as poolPubkey)
//   - userWallet       pubkey doing the trade (signer)
//   - amountIn         raw atomic units (string — JS numbers truncate u64)
//   - swapBaseForQuote true  = sell base token for CLAW
//                      false = buy base token with CLAW
//   - slippageBps      optional, defaults 100 (1%)
//
// We compute minimumAmountOut server-side from the quote so the caller doesn't
// have to. Returns an unsigned base64 tx — frontend signs with Phantom and
// submits.

import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { buildSwapTransaction, quoteSwap } from "@/lib/meteora";

export const runtime = "nodejs";

interface SwapBody {
  pool?: string;
  userWallet?: string;
  amountIn?: string;
  swapBaseForQuote?: boolean;
  slippageBps?: number;
}

export async function POST(req: NextRequest) {
  let body: SwapBody;
  try {
    body = (await req.json()) as SwapBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { pool, userWallet, amountIn, swapBaseForQuote, slippageBps } = body;

  if (!pool || !userWallet || !amountIn || swapBaseForQuote === undefined) {
    return NextResponse.json(
      {
        error: "pool, userWallet, amountIn (string), swapBaseForQuote required",
      },
      { status: 400 },
    );
  }

  let poolKey: PublicKey;
  let ownerKey: PublicKey;
  try {
    poolKey = new PublicKey(pool);
    ownerKey = new PublicKey(userWallet);
  } catch {
    return NextResponse.json(
      { error: "invalid pool or userWallet pubkey" },
      { status: 400 },
    );
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

    const tx = await buildSwapTransaction({
      pool: poolKey,
      owner: ownerKey,
      amountIn: amountInBig,
      minimumAmountOut: BigInt(quote.minimumAmountOut),
      swapBaseForQuote,
    });

    return NextResponse.json({
      status: "ready_to_sign",
      txBase64: tx.txBase64,
      quote,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: `swap build failed: ${msg}`,
        hint: "Pool may not exist, may already be migrated, or amountIn exceeds reserves. Try /api/pool/[mint] to check pool status first.",
      },
      { status: 502 },
    );
  }
}

export function GET() {
  return NextResponse.json(
    {
      error: "method not allowed",
      hint: "POST { pool, userWallet, amountIn, swapBaseForQuote, slippageBps? } to execute a swap.",
    },
    { status: 405 },
  );
}
