// POST /api/link-agent { agentId, displayName?, wallet?, agentApiKey? }
// Mirrors a clawpump.tech agent into our Neon "linked_agents" table.
// Stores ONLY metadata + a fetched profile snapshot. No API keys ever.
//
// If `agentApiKey` (cpk_…) is provided, we verify it belongs to `agentId`
// by hitting clawpump.tech `/api/agent/portfolio` server-side. The key is
// discarded as soon as the request returns.

import { NextRequest, NextResponse } from "next/server";
import { getAgentProfile, verifyAgentKey } from "@/lib/clawpump";
import { ensureSchema, linkAgent, listLinkedAgents } from "@/lib/db";

export const runtime = "nodejs";

interface LinkBody {
  agentId?: string;
  displayName?: string;
  wallet?: string;
  agentApiKey?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as LinkBody;
  const { agentId, displayName, wallet, agentApiKey } = body;
  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }
  try {
    await ensureSchema();
    let verified: { displayName?: string; wallet?: string } = {};
    if (agentApiKey) {
      const v = await verifyAgentKey(agentId, agentApiKey);
      if (!v.valid) {
        return NextResponse.json(
          { error: v.reason ?? "key verification failed" },
          { status: 401 },
        );
      }
      verified = { displayName: v.displayName, wallet: v.wallet };
    }
    const profile = await getAgentProfile(agentId);
    await linkAgent(
      agentId,
      displayName ?? verified.displayName ?? null,
      wallet ?? verified.wallet ?? null,
      profile,
    );
    return NextResponse.json({
      status: "linked",
      agentId,
      verified: Boolean(agentApiKey),
      profile,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}

export async function GET() {
  try {
    await ensureSchema();
    const rows = await listLinkedAgents(100);
    return NextResponse.json({ linked: rows, count: rows.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
