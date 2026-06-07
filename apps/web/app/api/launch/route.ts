// POST /api/launch — proxy to clawpump.tech /api/launch using the user-supplied
// agentApiKey (cpk_xxx). We NEVER store the key; pass-through only.

import { NextRequest, NextResponse } from "next/server";
import { launchToken } from "@/lib/clawpump";

export const runtime = "nodejs";

interface LaunchBody {
  name?: string;
  symbol?: string;
  description?: string;
  imageUrl?: string;
  agentId?: string;
  agentApiKey?: string;
  ownerWallet?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as LaunchBody;
  const { name, symbol, agentId, agentApiKey, description, imageUrl } = body;

  if (!name || !symbol || !agentId) {
    return NextResponse.json(
      { error: "name, symbol, agentId required" },
      { status: 400 },
    );
  }
  if (!agentApiKey || !agentApiKey.startsWith("cpk_")) {
    return NextResponse.json(
      { error: "agentApiKey (cpk_…) required for launch" },
      { status: 401 },
    );
  }

  try {
    const r = await launchToken(
      { name, symbol, description, imageUrl, agentId },
      agentApiKey,
    );
    return NextResponse.json({ status: "launched", ...r });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
