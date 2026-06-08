// POST /api/launch — proxy to clawpump.vercel.app /api/launch using the user-
// supplied agentApiKey (cpk_xxx). We NEVER store the key; pass-through only.
//
// We validate the body shape locally first because the upstream returns a
// silent `null` 200 on malformed input, which is useless to an LLM agent
// trying to figure out why its launch didn't fire.

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
  if (symbol.length > 10) {
    return NextResponse.json(
      { error: "symbol must be 10 chars or fewer" },
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
    // Upstream returns `null` (HTTP 200) when it silently rejects a payload.
    // Reject that defensively so the calling agent sees a useful error.
    if (r === null || typeof r !== "object") {
      return NextResponse.json(
        {
          error:
            "upstream returned null — payload rejected silently. Verify that the agentId matches the cpk owner, and that the wallet has enough CLAW for the 10k launch fee.",
          hint: "POST /api/agent/verify { agentId, agentApiKey } first to confirm ownership.",
        },
        { status: 502 },
      );
    }
    const mint =
      (r as { mint?: string }).mint ??
      (r as { mintAddress?: string }).mintAddress;
    return NextResponse.json({
      status: "launched",
      mint,
      ...r,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
