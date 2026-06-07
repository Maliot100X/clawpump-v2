import { NextRequest, NextResponse } from "next/server";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || "";
const CLAWPUMP_API = process.env.CLAWPUMP_API || "https://clawpump.tech";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "DMvsGEm3VZLfJCyQUnTnhLdH7vyFP9oQSFcrcrgBCLAW"; // CLAW ref

  if (!BIRDEYE_API_KEY) {
    return NextResponse.json({ priceUsd: "0.0123", note: "BIRDEYE_API_KEY missing in .env (demo)", token, source: "fallback" });
  }

  try {
    // Birdeye token price endpoint (public-ish with key)
    const res = await fetch(`https://public-api.birdeye.so/defi/price?address=${token}`, {
      headers: { "X-API-KEY": BIRDEYE_API_KEY, "accept": "application/json" },
    });
    const data = await res.json();
    return NextResponse.json({
      token,
      priceUsd: data?.data?.value || data?.data?.price || "0.0123",
      source: "birdeye",
      clawpump: CLAWPUMP_API,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, token, source: "birdeye-fail" }, { status: 200 });
  }
}
