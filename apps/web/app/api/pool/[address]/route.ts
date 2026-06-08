// GET /api/pool/[address] — read live DBC pool state from chain.
//
// Returns base/quote reserves, migration threshold, and progress %. The
// frontend uses this to render the "X% toward graduation" bar.
//
// The `[address]` segment is the pool pubkey (returned by /api/launch as
// poolPubkey). NOT the base mint — pool and mint are different accounts.

import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { readPoolState } from "@/lib/meteora";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  let poolKey: PublicKey;
  try {
    poolKey = new PublicKey(address);
  } catch {
    return NextResponse.json(
      { error: `invalid pool pubkey: ${address}` },
      { status: 400 },
    );
  }

  try {
    const snap = await readPoolState(poolKey);
    if (!snap) {
      return NextResponse.json(
        { error: "pool not found on chain — may not exist yet" },
        { status: 404 },
      );
    }
    return NextResponse.json(snap);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
