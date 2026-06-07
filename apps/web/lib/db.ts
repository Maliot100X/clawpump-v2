// Neon Postgres — OUR project server DB (caches, snapshots, agent profiles
// that the user has linked to our launchpad, NOT the source-of-truth registry).
//
// Uses the HTTPS-only @neondatabase/serverless driver — no TCP/pool setup,
// works inside Vercel Fluid Compute with zero cold-start cost.

import { neon } from "@neondatabase/serverless";
import type { AgentProfile } from "./clawpump";

let _sql: ReturnType<typeof neon> | null = null;

function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  _sql = neon(url);
  return _sql;
}

// Idempotent — safe to call on every cold start. In production we'd run via
// a one-shot migration; this is fine while iterating.
export async function ensureSchema() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS linked_agents (
      agent_id TEXT PRIMARY KEY,
      display_name TEXT,
      wallet TEXT,
      linked_at TIMESTAMPTZ DEFAULT NOW(),
      last_synced TIMESTAMPTZ,
      profile_json JSONB
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS claw_price_history (
      id BIGSERIAL PRIMARY KEY,
      price_usd NUMERIC NOT NULL,
      price_native NUMERIC NOT NULL,
      market_cap NUMERIC,
      volume_24h NUMERIC,
      captured_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_price_captured ON claw_price_history (captured_at DESC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS tokens_cache (
      mint TEXT PRIMARY KEY,
      symbol TEXT,
      name TEXT,
      agent_id TEXT,
      payload JSONB,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// Link an agent: persist their clawpump.tech profile so we can render the
// "My Agents" tab fast without hitting clawpump.tech every request.
export async function linkAgent(
  agentId: string,
  displayName: string | null,
  wallet: string | null,
  profile: AgentProfile,
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO linked_agents (agent_id, display_name, wallet, last_synced, profile_json)
    VALUES (${agentId}, ${displayName}, ${wallet}, NOW(), ${JSON.stringify(profile)}::jsonb)
    ON CONFLICT (agent_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      wallet       = EXCLUDED.wallet,
      last_synced  = NOW(),
      profile_json = EXCLUDED.profile_json
  `;
}

export interface LinkedAgentRow {
  agent_id: string;
  display_name: string | null;
  wallet: string | null;
  linked_at: string;
  last_synced: string | null;
  profile_json: AgentProfile | null;
}

export async function listLinkedAgents(limit = 50): Promise<LinkedAgentRow[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT agent_id, display_name, wallet, linked_at, last_synced, profile_json
    FROM linked_agents
    ORDER BY last_synced DESC NULLS LAST
    LIMIT ${limit}
  `) as unknown as LinkedAgentRow[];
  return rows;
}

export async function recordClawPrice(snapshot: {
  priceUsd: number;
  priceNative: number;
  marketCap: number;
  volume24h: number;
}): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO claw_price_history (price_usd, price_native, market_cap, volume_24h)
    VALUES (${snapshot.priceUsd}, ${snapshot.priceNative}, ${snapshot.marketCap}, ${snapshot.volume24h})
  `;
}

export interface ClawPricePoint {
  price_usd: number;
  price_native: number;
  captured_at: string;
}

export async function getClawPriceHistory(
  hours = 24,
): Promise<ClawPricePoint[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT price_usd, price_native, captured_at
    FROM claw_price_history
    WHERE captured_at > NOW() - (${hours} || ' hours')::interval
    ORDER BY captured_at ASC
  `) as unknown as ClawPricePoint[];
  return rows;
}
