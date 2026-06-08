// Wrapper around the existing ClawPump platform API at clawpump.tech.
// Most reads (tokens, stats, leaderboard, fees) are OPEN — no auth required.
// Writes / agent-scoped queries need Bearer cpk_xxx (user's per-agent API key).
//
// We NEVER store user agent_api_keys server-side; they pass through per request
// when a logged-in user submits their existing agent_id + agent_api_key.

const CP_BASE = process.env.CLAWPUMP_API || "https://clawpump.vercel.app";
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
  // Per-agent listing has its own documented endpoint (`/api/launches`) and
  // upstream `/api/tokens?agentId=` actually IGNORES the filter — it returns
  // every token on the platform. Route per-agent calls through the correct
  // endpoint instead.
  if (q.agentId) return listAgentLaunches(q.agentId, q.limit ?? 50);
  const params = new URLSearchParams();
  if (q.sort) params.set("sort", q.sort);
  if (q.limit) params.set("limit", String(q.limit));
  if (q.offset) params.set("offset", String(q.offset));
  const qs = params.toString();
  const key = `tokens:${qs}`;
  const cached = getCached<CpToken[]>(key);
  if (cached) return cached;
  try {
    interface RawTok {
      mintAddress?: string;
      mint?: string;
      name?: string;
      symbol?: string;
      imageUrl?: string;
      agentId?: string;
      marketCap?: number;
      price?: number;
      volume24h?: number;
      isGraduated?: boolean;
      graduated?: boolean;
      createdAt?: string;
      [k: string]: unknown;
    }
    const data = await cpFetch<{ tokens?: RawTok[] } | RawTok[]>(
      `/api/tokens${qs ? `?${qs}` : ""}`,
    );
    const raw = Array.isArray(data) ? data : (data.tokens ?? []);
    const arr: CpToken[] = raw.map((t) => ({
      mint: t.mintAddress ?? t.mint ?? "",
      symbol: t.symbol ?? "",
      name: t.name ?? "",
      imageUrl: t.imageUrl,
      agentId: t.agentId,
      createdAt: t.createdAt,
      graduated: t.isGraduated ?? t.graduated,
      marketCap: t.marketCap,
      volume24h: t.volume24h,
      ...t,
    }));
    setCached(key, arr);
    return arr;
  } catch {
    setCached(key, []);
    return [];
  }
}

// `GET /api/launches?agentId=X` is the documented per-agent listing. We still
// filter the response client-side: if clawpump.vercel.app ever regresses and
// starts echoing back unrelated rows, we don't mirror them into Neon by
// accident. We also normalize their field names (`mintAddress`/`requestName`)
// to our canonical `CpToken` shape so the rest of the app stays consistent.
interface RawLaunch {
  id?: number | string;
  tokenId?: number | string;
  agentId?: string;
  claimAgentId?: string;
  requestName?: string;
  requestSymbol?: string;
  name?: string;
  symbol?: string;
  mintAddress?: string;
  mint?: string;
  txHash?: string;
  status?: string;
  source?: string;
  imageUrl?: string;
  createdAt?: string;
  completedAt?: string;
  [k: string]: unknown;
}
function normalizeLaunch(r: RawLaunch): CpToken {
  return {
    mint: r.mintAddress ?? r.mint ?? "",
    symbol: r.requestSymbol ?? r.symbol ?? "",
    name: r.requestName ?? r.name ?? "",
    imageUrl: r.imageUrl,
    agentId: r.agentId,
    createdAt: r.createdAt,
    graduated: r.status === "graduated",
    ...r,
  };
}

export async function listAgentLaunches(
  agentId: string,
  limit = 50,
): Promise<CpToken[]> {
  const key = `launches:${agentId}:${limit}`;
  const cached = getCached<CpToken[]>(key);
  if (cached) return cached;
  try {
    const data = await cpFetch<
      { launches?: RawLaunch[]; tokens?: RawLaunch[] } | RawLaunch[]
    >(`/api/launches?agentId=${encodeURIComponent(agentId)}&limit=${limit}`);
    const raw = Array.isArray(data)
      ? data
      : (data.launches ?? data.tokens ?? []);
    const filtered = raw
      .filter((t) => t.agentId === agentId || t.claimAgentId === agentId)
      .map(normalizeLaunch);
    setCached(key, filtered);
    return filtered;
  } catch {
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
    interface RawLbRow {
      agentId?: string;
      name?: string;
      displayName?: string;
      imageUrl?: string;
      tokenCount?: number;
      launches?: number;
      totalEarned?: number;
      earned?: number;
      volume?: number;
      tier?: string;
      rank?: number;
      [k: string]: unknown;
    }
    const data = await cpFetch<
      | { agents?: RawLbRow[]; leaderboard?: RawLbRow[] }
      | RawLbRow[]
    >(`/api/leaderboard?limit=${limit}`);
    const raw = Array.isArray(data)
      ? data
      : (data.agents ?? data.leaderboard ?? []);
    // Normalize: upstream uses `name` + `tokenCount` + `totalEarned`. Our row
    // shape uses `displayName` + `launches` + `earned`.
    const arr: CpLeaderboardRow[] = raw.map((r, i) => ({
      agentId: r.agentId ?? "",
      displayName: r.displayName ?? r.name,
      launches: r.launches ?? r.tokenCount,
      earned: r.earned ?? r.totalEarned,
      volume: r.volume,
      tier: r.tier,
      rank: r.rank ?? i + 1,
      ...r,
    }));
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

// `GET /api/agent/portfolio` — authenticated. Returns the agent attached to a
// given `cpk_xxx` Bearer. We use it to verify ownership when a user pastes
// `agentId + cpk` into our "Link existing agent" form.
//
// Real shape from clawpump.vercel.app:
//   { success, agentId, walletAddress, balances: {sol,usdc},
//     tokens: [...spl tokens in the wallet...],
//     earnings: { agent: { name, walletAddress }, totalEarned, totalSent,
//                 totalPending, tokens: [...] } }
export interface CpAgentPortfolio {
  success?: boolean;
  agentId?: string;
  walletAddress?: string;
  balances?: { sol?: string; usdc?: string };
  tokens?: unknown[];
  earnings?: {
    agentId?: string;
    agent?: { name?: string; walletAddress?: string };
    totalEarned?: number;
    totalSent?: number;
    totalPending?: number;
    totalHeld?: number;
    totalFailed?: number;
    tokens?: unknown[];
  };
  [k: string]: unknown;
}

export async function getAgentPortfolio(
  agentApiKey: string,
): Promise<CpAgentPortfolio> {
  return cpFetch<CpAgentPortfolio>(`/api/agent/portfolio`, {
    bearer: agentApiKey,
  });
}

export interface VerifyResult {
  valid: boolean;
  agentId: string;
  displayName?: string;
  wallet?: string;
  portfolio: CpAgentPortfolio | null;
  reason?: string;
}

// Prove that the supplied `cpk_xxx` actually belongs to the supplied agentId.
// Never log or persist the key. The caller is responsible for that discipline
// too — this function returns only verified metadata.
export async function verifyAgentKey(
  agentId: string,
  agentApiKey: string,
): Promise<VerifyResult> {
  if (!agentApiKey.startsWith("cpk_")) {
    return {
      valid: false,
      agentId,
      portfolio: null,
      reason: "key must start with cpk_",
    };
  }
  try {
    const p = await getAgentPortfolio(agentApiKey);
    const remoteId = p.agentId ?? p.earnings?.agentId ?? "";
    const ok = remoteId === agentId;
    return {
      valid: ok,
      agentId,
      displayName: p.earnings?.agent?.name,
      wallet: p.walletAddress ?? p.earnings?.agent?.walletAddress,
      portfolio: p,
      reason: ok ? undefined : `key belongs to ${remoteId || "another agent"}`,
    };
  } catch (e) {
    return {
      valid: false,
      agentId,
      portfolio: null,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}
