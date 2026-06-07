// GET /api/tier?wallet=<solanaPubkey>
// Real on-chain CLAW balance via Helius RPC + spl-token ATA lookup.
// Tier thresholds: Cub 10k, Lion 100k, Apex 1M CLAW.

import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount, getMint } from "@solana/spl-token";
import { CLAW_MINT } from "@/lib/dexscreener";

export const runtime = "nodejs";
export const revalidate = 0;

const HELIUS_RPC =
  process.env.HELIUS_RPC ||
  (process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : "https://api.mainnet-beta.solana.com");

const connection = new Connection(HELIUS_RPC, "confirmed");

function tierFor(balance: number) {
  if (balance >= 1_000_000) return "Apex";
  if (balance >= 100_000) return "Lion";
  if (balance >= 10_000) return "Cub";
  return "None";
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  let owner: PublicKey;
  let mint: PublicKey;
  try {
    owner = new PublicKey(wallet);
    mint = new PublicKey(CLAW_MINT);
  } catch (e) {
    return NextResponse.json(
      { error: `invalid pubkey: ${e instanceof Error ? e.message : e}` },
      { status: 400 },
    );
  }

  try {
    // Look up the mint's actual decimals so we don't hard-code wrong.
    const mintInfo = await getMint(connection, mint);
    const ata = await getAssociatedTokenAddress(mint, owner);
    let raw = 0n;
    try {
      const acct = await getAccount(connection, ata);
      raw = acct.amount;
    } catch {
      raw = 0n; // ATA doesn't exist -> 0 balance
    }
    const balance = Number(raw) / 10 ** mintInfo.decimals;
    const tier = tierFor(balance);
    return NextResponse.json({
      wallet,
      clawMint: CLAW_MINT,
      balanceClaw: balance,
      tier,
      canLaunch: tier !== "None",
      thresholds: { Cub: 10_000, Lion: 100_000, Apex: 1_000_000 },
      source: "helius",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), wallet, clawMint: CLAW_MINT },
      { status: 502 },
    );
  }
}
