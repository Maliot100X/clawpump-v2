// Wrapper around the existing ClawPump platform API at clawpump.tech.
// Most reads (tokens, stats, leaderboard, fees) are OPEN — no auth required.
// Writes / agent-scoped queries need Bearer cpk_xxx (user's per-agent API key).
//
// We NEVER store user agent_api_keys server-side; they pass through per request
// when a logged-in user submits their existing agent_id + agent_api_key.

const CP_BASE = process.env.CLAWPUMP_API || "https://clawpump.tech";
const CACHE_TTL_MS = 15_000;

type CacheEntry<T> = { at: number; data: T };
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data as T;
}
function setCached<T>(key: string, data: T) {
  cache.set(key, { at: Date.now(), data });
}

async function cpFetch<T>(
  path: string,
  init?: RequestInit & { bearer?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (init?.bearer) headers.Authorization = `Bearer ${init.bearer}`;
  const res = await fetch(`${CP_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`clawpump ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

// ----- Public reads (no key required) ---------------------------------------

export interface CpToken {
  mint: string;
  symbol: string;
  name: string;
  imageUrl?: string;
  agentId?: string;
  createdAt?: string;
  curveProgress?: number; // 0..100
  graduated?: boolean;
  marketCap?: number;
  volume24h?: number;
  holders?: number;
  // raw passthrough for unknown fields
  [k: string]: unknown;
}

export interface CpTokensQuery {
  sort?: "hot" | "new" | "graduated" | "volume";
  limit?: number;
  offset?: number;
  agentId?: string;
}

export async function listTokens(q: CpTokensQuery = {}): Promise<CpToken[]> {
  const params = new URLSearchParams();
  if (q.sort) params.set("sort", q.sort);
  if (q.limit) params.set("limit", String(q.limit));
  if (q.offset) params.set("offset", String(q.offset));
  if (q.agentId) params.set("agentId", q.agentId);
  const qs = params.toString();
  const key = `tokens:${qs}`;
  const cached = getCached<CpToken[]>(key);
  if (cached) return cached;
  try {
    const data = await cpFetch<{ tokens?: CpToken[] } | CpToken[]>(
      `/api/tokens${qs ? `?${qs}` : ""}`,
    );
    const arr = Array.isArray(data) ? data : (data.tokens ?? []);
    setCached(key, arr);
    return arr;
  } catch {
    // Platform may not expose this exact path -- empty rather than blowing up the page.
    setCached(key, []);
    return [];
  }
}

export interface CpStats {
  totalLaunches?: number;
  graduated?: number;
  activeAgents?: number;
  volume24h?: number;
  totalFees?: number;
  [k: string]: unknown;
}

export async function getStats(): Promise<CpStats> {
  const cached = getCached<CpStats>("stats");
  if (cached) return cached;
  try {
    const data = await cpFetch<CpStats>(`/api/stats`);
    setCached("stats", data);
    return data;
  } catch {
    return {};
  }
}

export interface CpLeaderboardRow {
  agentId: string;
  displayName?: string;
  launches?: number;
  earned?: number;
  volume?: number;
  tier?: string;
  rank?: number;
  [k: string]: unknown;
}

export async function getLeaderboard(
  limit = 25,
): Promise<CpLeaderboardRow[]> {
  const key = `lb:${limit}`;
  const cached = getCached<CpLeaderboardRow[]>(key);
  if (cached) return cached;
  try {
    const data = await cpFetch<
      { leaderboard?: CpLeaderboardRow[] } | CpLeaderboardRow[]
    >(`/api/leaderboard?limit=${limit}`);
    const arr = Array.isArray(data) ? data : (data.leaderboard ?? []);
    setCached(key, arr);
    return arr;
  } catch {
    return [];
  }
}

export interface CpEarnings {
  agentId: string;
  totalEarned?: number;
  pendingEarnings?: number;
  launches?: number;
  tokens?: CpToken[];
  [k: string]: unknown;
}

// /api/fees/earnings?agentId=X is OPEN per docs.
export async function getAgentEarnings(agentId: string): Promise<CpEarnings> {
  const key = `earn:${agentId}`;
  const cached = getCached<CpEarnings>(key);
  if (cached) return cached;
  try {
    const data = await cpFetch<CpEarnings>(
      `/api/fees/earnings?agentId=${encodeURIComponent(agentId)}`,
    );
    setCached(key, data);
    return data;
  } catch {
    return { agentId };
  }
}

// Combined "agent profile" — earnings + their tokens. We invent this shape;
// the platform doesn't expose a single GET /api/agent/{id} JSON endpoint.
export interface AgentProfile {
  agentId: string;
  earnings: CpEarnings;
  launches: CpToken[];
}

export async function getAgentProfile(agentId: string): Promise<AgentProfile> {
  const [earnings, launches] = await Promise.all([
    getAgentEarnings(agentId),
    listTokens({ agentId, limit: 50 }),
  ]);
  return { agentId, earnings, launches };
}

// ----- Authenticated writes (Bearer cpk_xxx) --------------------------------
// These run server-side only and require the user to supply their own key.
// Never log the key. Never store it.

export interface CpLaunchInput {
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  agentId: string;
  // Server enforces the 10k CLAW fee + CLAW quote; we just forward.
}

export interface CpLaunchResult {
  mint?: string;
  tx?: string;
  curve?: string;
  [k: string]: unknown;
}

export async function launchToken(
  input: CpLaunchInput,
  agentApiKey: string,
): Promise<CpLaunchResult> {
  return cpFetch<CpLaunchResult>(`/api/launch`, {
    method: "POST",
    bearer: agentApiKey,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
