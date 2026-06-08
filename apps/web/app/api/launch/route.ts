// POST /api/launch — real on-chain CLAW-quoted Meteora DBC pool creation.
//
// FLOW:
//   1. Browser POSTs { name, symbol, uri, userWallet }
//   2. We build a `createConfigAndPool` tx via the SDK with sensible defaults:
//      - CLAW as quote token
//      - User is poolCreator + fee_claimer (gets all trading fees)
//      - 0 SOL pool creation fee (free tier)
//      - Migration target: DAMM v2 at 100k CLAW market cap
//   3. We pre-sign with ephemeral config + baseMint keypairs.
//   4. We return base64 tx for browser to finalize-sign with Phantom.
//   5. Browser sends to Solana, returns mint address to frontend.
//
// IMPORTANT: This route DOES NOT submit the tx. The user's wallet signs +
// submits client-side. We never see a private key. This is the non-custodial
// path. Agent custodial path lives in a separate (future) route once we add
// the wallet-vault.
//
// Legacy SOL-quoted launches (pump.fun-style via clawpump.vercel.app) are no
// longer proxied through here — that upstream is a separate product. Use
// `POST https://clawpump.vercel.app/api/launch` directly for those.

import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { buildLaunchTransaction } from "@/lib/meteora";

export const runtime = "nodejs";

interface LaunchBody {
  name?: string;
  symbol?: string;
  uri?: string;
  userWallet?: string;
  initialMarketCapClaw?: number;
  migrationMarketCapClaw?: number;
}

export async function POST(req: NextRequest) {
  let body: LaunchBody;
  try {
    body = (await req.json()) as LaunchBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const {
    name,
    symbol,
    uri,
    userWallet,
    initialMarketCapClaw,
    migrationMarketCapClaw,
  } = body;

  if (!name || name.length > 32) {
    return NextResponse.json(
      { error: "name required, max 32 chars" },
      { status: 400 },
    );
  }
  if (!symbol || symbol.length > 10) {
    return NextResponse.json(
      { error: "symbol required, max 10 chars" },
      { status: 400 },
    );
  }
  if (!uri) {
    return NextResponse.json(
      {
        error:
          "uri required — must point to a Metaplex JSON metadata file (image, description, name). Upload to IPFS or your CDN first.",
      },
      { status: 400 },
    );
  }
  if (!userWallet) {
    return NextResponse.json(
      {
        error:
          "userWallet required — base58 public key. Connect Phantom or Solflare in the frontend, or pass the wallet pubkey explicitly when calling from a server.",
      },
      { status: 400 },
    );
  }

  let payer: PublicKey;
  try {
    payer = new PublicKey(userWallet);
  } catch {
    return NextResponse.json(
      { error: `userWallet is not a valid Solana public key: ${userWallet}` },
      { status: 400 },
    );
  }

  if (
    initialMarketCapClaw !== undefined &&
    (!Number.isFinite(initialMarketCapClaw) || initialMarketCapClaw <= 0)
  ) {
    return NextResponse.json(
      { error: "initialMarketCapClaw must be a positive number" },
      { status: 400 },
    );
  }
  if (
    migrationMarketCapClaw !== undefined &&
    (!Number.isFinite(migrationMarketCapClaw) ||
      (initialMarketCapClaw !== undefined &&
        migrationMarketCapClaw <= initialMarketCapClaw))
  ) {
    return NextResponse.json(
      {
        error:
          "migrationMarketCapClaw must be a positive number greater than initialMarketCapClaw",
      },
      { status: 400 },
    );
  }

  try {
    const bundle = await buildLaunchTransaction({
      name,
      symbol,
      uri,
      payer,
      poolCreator: payer,
      feeClaimer: payer,
      curveOpts:
        initialMarketCapClaw || migrationMarketCapClaw
          ? { initialMarketCapClaw, migrationMarketCapClaw }
          : undefined,
    });
    return NextResponse.json({
      status: "ready_to_sign",
      ...bundle,
      instructions: {
        next: "Deserialize txBase64 with Transaction.from(Buffer.from(txBase64,'base64')), sign with the user's wallet (Phantom/Solflare), submit via connection.sendRawTransaction, then poll for the baseMint on chain to confirm.",
        decimals: 6,
        quoteMint: process.env.CLAW_MINT,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: `failed to build launch tx: ${msg}`,
        hint: "Common causes: invalid wallet address, RPC unreachable, CLAW_MINT env missing. Sanity check: GET /api/claw should return live CLAW price.",
      },
      { status: 502 },
    );
  }
}

export function GET() {
  return NextResponse.json(
    {
      error: "method not allowed",
      hint: "POST { name, symbol, uri, userWallet } to launch a CLAW-quoted token.",
    },
    { status: 405 },
  );
}
