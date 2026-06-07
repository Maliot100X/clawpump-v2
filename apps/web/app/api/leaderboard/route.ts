// GET /api/leaderboard?limit=25 — agent leaderboard from clawpump.tech.

import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/clawpump";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const limit = Math.min(
    100,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 25)),
  );
  const rows = await getLeaderboard(limit);
  return NextResponse.json({ leaderboard: rows, count: rows.length });
}
