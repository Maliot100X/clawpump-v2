// POST /api/agent/verify { agentId, agentApiKey, displayName?, wallet? }
// Verify a clawpump.tech cpk_ key belongs to the claimed agentId by hitting
// `GET /api/agent/portfolio` server-side, then mirror the verified profile
// into our Neon `linked_agents` table.
//
// The cpk key NEVER touches Neon. It lives only in the request scope of this
// handler, is forwarded once to clawpump.tech, and is discarded when the
// function returns.

import { NextRequest, NextResponse } from "next/server";
import { getAgentProfile, verifyAgentKey } from "@/lib/clawpump";
import { ensureSchema, linkAgent } from "@/lib/db";

export const runtime = "nodejs";

interface VerifyBody {
  agentId?: string;
  agentApiKey?: string;
  displayName?: string;
  wallet?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as VerifyBody;
  const { agentId, agentApiKey, displayName, wallet } = body;

  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }
  if (!agentApiKey) {
    return NextResponse.json(
      { error: "agentApiKey (cpk_…) required" },
      { status: 401 },
    );
  }

  const v = await verifyAgentKey(agentId, agentApiKey);
  if (!v.valid) {
    return NextResponse.json(
      { valid: false, reason: v.reason ?? "verification failed" },
      { status: 401 },
    );
  }

  try {
    await ensureSchema();
    // Re-fetch the public profile (filtered launches + open earnings) so we
    // store the same shape as the unauthenticated link flow.
    const profile = await getAgentProfile(agentId);
    await linkAgent(
      agentId,
      displayName ?? v.displayName ?? null,
      wallet ?? v.wallet ?? null,
      profile,
    );
    return NextResponse.json({
      valid: true,
      agentId,
      displayName: v.displayName ?? null,
      wallet: v.wallet ?? null,
      profile,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
