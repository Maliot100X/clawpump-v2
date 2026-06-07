// GET /api/agent/[id] — agent profile (earnings + launches) from clawpump.tech.

import { NextRequest, NextResponse } from "next/server";
import { getAgentProfile } from "@/lib/clawpump";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  try {
    const profile = await getAgentProfile(id);
    return NextResponse.json(profile);
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 502 },
    );
  }
}
