// POST /api/link-agent { agentId, displayName?, wallet? }
// Mirrors a clawpump.tech agent into our Neon "linked_agents" table.
// Stores ONLY metadata + a fetched profile snapshot. No API keys ever.

import { NextRequest, NextResponse } from "next/server";
import { getAgentProfile } from "@/lib/clawpump";
import { ensureSchema, linkAgent, listLinkedAgents } from "@/lib/db";

export const runtime = "nodejs";

interface LinkBody {
  agentId?: string;
  displayName?: string;
  wallet?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as LinkBody;
  const { agentId, displayName, wallet } = body;
  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }
  try {
    await ensureSchema();
    const profile = await getAgentProfile(agentId);
    await linkAgent(agentId, displayName ?? null, wallet ?? null, profile);
    return NextResponse.json({ status: "linked", agentId, profile });
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
