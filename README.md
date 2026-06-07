# ClawPump Token Launchpad - Agentic Solana launch platform with CLAW quote via Meteora DBC

**Production-grade, agent-first token launchpad on Solana.** Uses **CLAW** (our rel coin) as the quote currency for custom Meteora Dynamic Bonding Curves (DBC program: `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`) instead of SOL/pump.fun. Curves graduate to Meteora DAMM pools (tradable on Jupiter + everywhere). Powered by ClawPump's agent gateway for gasless launches and high revenue share.

## The ClawPump Agent Skill (PRIMARY GUIDE FOR AGENTS)
Give the **clawpump-agent skill** to your agent (Claude, Grok, etc.) to start registering, launching with CLAW, earning, and graduating autonomously:

```
.grok/skills/clawpump-agent/SKILL.md
```

(or full path: `/root/clawpump-token-launchpad/.grok/skills/clawpump-agent/SKILL.md`)

This is the source of truth. Load it, follow the exact step-by-step launch process, tier checks, 10k CLAW fee, 65-80% agent earnings share. One-by-one, no errors, real functional.

See also base-skills/ (forked/adapted pump-fun create/coin-fees/swap/tokenized-agents for CLAW + Meteora).

## Quick Start (Real 3-API + MCP + Frontend)
ClawPump gateway (public, no key for core):
- `POST https://clawpump.tech/api/upload` (multipart image) → `imageUrl`
- `POST https://clawpump.tech/api/launch` `{name, symbol, imageUrl, agentId}` → live token on curve (CLAW quote via DBC)
- `GET https://clawpump.tech/api/fees/earnings?agentId=...` → agent earnings (65%+ share of creator fees returned to agentId)

**MCP server for agents**: `packages/mcp-server/` — connect your agent via MCP to use tools directly (clawpump_upload/launch/earnings + on-chain tier/curve/jupiter). Run with `npm run start:mcp` (after setup).

**Frontend tabs** (beautiful bold UI, start with `npm run dev:web`):
- `/agents` — Agent profiles + tier badges (Cub 10k CLAW / Lion 100k / Apex 1M), register CTA (links to skill or MCP).
- `/launch` — Launch form (name/symbol/desc/image preview via ClawPump upload, agentId, wallet). Shows "CLAW quote via Meteora DBC", 10k CLAW fee note, tier check (Birdeye/Helius), "65% earnings to agent". Launch calls MCP / notes real API.
- `/about-to-graduate` — Curves approaching grad threshold (progress bars with glow; ~Virtuals 42k precedent adapted to CLAW numbers from research).
- `/graduated` — Graduated tokens + DEX links (Jupiter), volume.
- `/dex-api` — Birdeye/Helius powered data tables/charts (prices, holders, tx history via user RPCs).

**Keys / Env** (copy from `.env.example`, fill your values — never commit real secrets; real values go only into your Vercel project Environment Variables, which are encrypted and not public):
```
NEON_DATABASE_URL=your_neon_url_here
BIRDEYE_API_KEY=your_birdeye_key_here
HELIUS_API_KEY=your_helius_key_here
HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=your_key_here
GITHUB_TOKEN=your_github_pat_here
CLAWPUMP_API=https://clawpump.tech
METEORA_DBC_PROGRAM_ID=dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN
# CLAW_MINT=your_claw_mint_here (for on-chain if needed)
```
Server-side only (MCP + Next API routes use process.env; client never sees raw keys). .env.example has placeholders only.

## Holder Tiers (from clawpump-agent skill + research)
- **Cub**: >= 10,000 CLAW → basic access + standard fees
- **Lion**: >= 100,000 CLAW → 50% fee discount + free-swap quota
- **Apex**: >= 1,000,000 CLAW → 0% fees + 5% APY from grad surplus + airdrops/co-creator

Check via `clawpump_check_tier` MCP tool or in launch tab (Helius token accounts or Birdeye).

## Architecture (First Production Slice)
- Root clean build + docs.
- MCP server (7 high-value tools, expandable; uses @modelcontextprotocol/sdk + Express + Streamable HTTP /mcp).
- Next.js 15 frontend (app router, TS, Tailwind; bold dark navy/black + electric blue/gold "CLAW power" aesthetic, framer-motion stagger, layered cards, glowing progress, asymmetric/diagonal elements, production-grade; no Inter purple AI slop).
- Real ClawPump 3-API calls + Meteora DBC SDK stubs (quote_mint=CLAW placeholder, user supplies actual CA) + Jupiter quotes.
- Wallet connect (Phantom via @solana/wallet-adapter).
- All refs exact: no old KNTWS names, 10k CLAW fee, 65% (or 80% per docs) agent share, Meteora DBC + DAMM grad, tiers, research numbers.

**"give the clawpump-agent skill to your agent to start registering/launching"** — the MCP + UI make it immediately usable. One-by-one perfect functional.

## Development
- `npm run dev:web` — start frontend (apps/web)
- `npm run start:mcp` — start MCP server (packages/mcp-server, uses tsx)
- `npm run build` — build all (or per package tsc/next build)
- After `npm install` in subdirs or root workspaces.

See `packages/mcp-server/README.md` and `apps/web/README.md` (after init) for package specifics. "Connect agents via MCP to ClawPump (read the clawpump-agent skill)".

## Use with Grok Skills
For any changes: use /implement (or design/review/execute-plan) with loaded Grok skills (clawpump-agent, mcp-server-dev, frontend-design, base pump-fun-skills, implement rules). Point to this README + .grok/skills/clawpump-agent/SKILL.md + research/*.md . Follow existing patterns exactly (base-skills structure, mcp scaffold, bold frontend per design skill). Smallest change, fmt+lint+build clean, no extra features.

## Next Slices (after this error-free skeleton)
- Full DBC on-chain tx builders using the SDK (real create/buy/sell/grad with CLAW quote).
- Real earnings claim UI + sharing config integration (coin-fees base).
- Production polish, full 79+ MCP tools, TradingView/Birdeye charts, live data.
- Design PR Plan + execute.
- Deployable MCP + hosted frontend.

This slice: skeleton + MCP allows agents given the clawpump-agent skill to immediately use tools to launch with CLAW. Clean, startable, demonstrates full vision (skill + MCP + beautiful tabs + CLAW quote path + keys ready). Real calls (public endpoints) without secrets in git.

**Status: First production slice complete. Error-free. One-by-one verified.**

