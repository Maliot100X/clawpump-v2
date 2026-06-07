// Real Dexscreener client for CLAW token + arbitrary Solana mints.
// Free public API, 60 req/min limit -> we cache 30s in-memory per Vercel function instance (Fluid Compute reuses instances).
// Docs: https://docs.dexscreener.com/api/reference

export const CLAW_MINT =
  process.env.CLAW_MINT || "739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump";

const DS_BASE = "https://api.dexscreener.com";
const CACHE_TTL_MS = 30_000;

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

export interface DsPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceNative: string; // base price denominated in quote token (e.g. SOL)
  priceUsd?: string;
  fdv?: number;
  marketCap?: number;
  liquidity?: { usd?: number; base?: number; quote?: number };
  volume?: { h24?: number; h6?: number; h1?: number; m5?: number };
  priceChange?: { h24?: number; h6?: number; h1?: number; m5?: number };
  txns?: {
    h24?: { buys: number; sells: number };
    h6?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
    m5?: { buys: number; sells: number };
  };
  pairCreatedAt?: number;
}

export interface TokenSnapshot {
  mint: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceNative: number; // CLAW priced in SOL (or quote token of best pair)
  quoteSymbol: string;
  marketCap: number;
  fdv: number;
  liquidityUsd: number;
  volume24h: number;
  priceChange24h: number;
  txns24h: { buys: number; sells: number };
  pairAddress: string;
  dexId: string;
  url: string;
  fetchedAt: number;
}

async function dsFetch<T>(path: string): Promise<T> {
  const url = `${DS_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // Cache layer is ours; tell Next not to dedupe across requests-with-state.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`dexscreener ${res.status} ${path}`);
  }
  return (await res.json()) as T;
}

// /token-pairs/v1/{chainId}/{tokenAddress} -> returns array of pairs (sorted by liquidity desc).
export async function getPairsForToken(mint: string): Promise<DsPair[]> {
  const key = `pairs:${mint}`;
  const cached = getCached<DsPair[]>(key);
  if (cached) return cached;
  const data = await dsFetch<DsPair[]>(`/token-pairs/v1/solana/${mint}`);
  const sorted = (Array.isArray(data) ? data : []).sort(
    (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
  );
  setCached(key, sorted);
  return sorted;
}

// Pick the best pair (highest liquidity) and flatten to a snapshot we can use everywhere.
export async function getTokenSnapshot(mint: string): Promise<TokenSnapshot> {
  const pairs = await getPairsForToken(mint);
  if (pairs.length === 0) {
    throw new Error(`No Dexscreener pairs for mint ${mint}`);
  }
  const best = pairs[0];
  return {
    mint,
    symbol: best.baseToken.symbol,
    name: best.baseToken.name,
    priceUsd: Number(best.priceUsd ?? 0),
    priceNative: Number(best.priceNative ?? 0),
    quoteSymbol: best.quoteToken.symbol,
    marketCap: best.marketCap ?? best.fdv ?? 0,
    fdv: best.fdv ?? 0,
    liquidityUsd: best.liquidity?.usd ?? 0,
    volume24h: best.volume?.h24 ?? 0,
    priceChange24h: best.priceChange?.h24 ?? 0,
    txns24h: best.txns?.h24 ?? { buys: 0, sells: 0 },
    pairAddress: best.pairAddress,
    dexId: best.dexId,
    url: best.url,
    fetchedAt: Date.now(),
  };
}

// Convenience: the CLAW snapshot, used by curve math + UI header.
export async function getClawSnapshot(): Promise<TokenSnapshot> {
  return getTokenSnapshot(CLAW_MINT);
}

// Batch lookup (up to 30 addresses per call per Dexscreener docs).
export async function getMultiSnapshot(mints: string[]): Promise<TokenSnapshot[]> {
  if (mints.length === 0) return [];
  const chunk = mints.slice(0, 30);
  const key = `multi:${chunk.sort().join(",")}`;
  const cached = getCached<TokenSnapshot[]>(key);
  if (cached) return cached;
  const data = await dsFetch<DsPair[]>(`/tokens/v1/solana/${chunk.join(",")}`);
  const byMint = new Map<string, DsPair>();
  for (const p of data) {
    const m = p.baseToken.address;
    const cur = byMint.get(m);
    if (!cur || (p.liquidity?.usd ?? 0) > (cur.liquidity?.usd ?? 0)) {
      byMint.set(m, p);
    }
  }
  const out: TokenSnapshot[] = [];
  for (const m of chunk) {
    const p = byMint.get(m);
    if (!p) continue;
    out.push({
      mint: m,
      symbol: p.baseToken.symbol,
      name: p.baseToken.name,
      priceUsd: Number(p.priceUsd ?? 0),
      priceNative: Number(p.priceNative ?? 0),
      quoteSymbol: p.quoteToken.symbol,
      marketCap: p.marketCap ?? p.fdv ?? 0,
      fdv: p.fdv ?? 0,
      liquidityUsd: p.liquidity?.usd ?? 0,
      volume24h: p.volume?.h24 ?? 0,
      priceChange24h: p.priceChange?.h24 ?? 0,
      txns24h: p.txns?.h24 ?? { buys: 0, sells: 0 },
      pairAddress: p.pairAddress,
      dexId: p.dexId,
      url: p.url,
      fetchedAt: Date.now(),
    });
  }
  setCached(key, out);
  return out;
}
