import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

const HELIUS_RPC = process.env.HELIUS_RPC || (process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : "https://api.mainnet-beta.solana.com");
const CLAW_MINT = process.env.CLAW_MINT || "DMvsGEm3VZLfJCyQUnTnhLdH7vyFP9oQSFcrcrgBCLAW";
const connection = new Connection(HELIUS_RPC, "confirmed");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  try {
    const owner = new PublicKey(wallet);
    const clawMint = new PublicKey(CLAW_MINT);
    const ata = await getAssociatedTokenAddress(clawMint, owner);
    let balance = 0;
    try {
      const account = await getAccount(connection, ata);
      balance = Number(account.amount) / 1_000_000; // 6 decimals assumption for CLAW
    } catch {
      balance = 0;
    }

    let tier: string = "None";
    if (balance >= 1_000_000) tier = "Apex";
    else if (balance >= 100_000) tier = "Lion";
    else if (balance >= 10_000) tier = "Cub";

    return NextResponse.json({
      wallet,
      clawMint: CLAW_MINT,
      balanceClaw: balance,
      tier,
      canLaunch: tier !== "None",
      thresholds: { Cub: 10000, Lion: 100000, Apex: 1000000 },
      note: "Real on-chain via Helius RPC from server .env. 10k CLAW min per clawpump-agent skill.",
      source: "helius",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, wallet, clawMint: CLAW_MINT }, { status: 500 });
  }
}
