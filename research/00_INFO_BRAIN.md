# INFO BRAIN — ClawPump + Rel Coin + Virtuals-style Launchpad on Solana
**Date saved:** 2026-06-07 (fresh research session)
**Purpose:** Permanent, queryable knowledge base. Never lose the full setup. When asked "virtual ai you know the full setup", load this + the PRD.

## Core User Vision (exact from history)
- Build something like pump.fun launching tokens, but **people need to hold "our rel coin"**.
- "Instead of sol" — launch must be with ClawPump.
- Buy token must be with ClawPump or the custom bonding curve.
- Successful launches graduate to DEX everywhere (like pump.fun -> Raydium/PumpSwap).
- Model after **Virtuals Protocol** on Base: they launch agent tokens with **$VIRTUAL as the quote currency**, not ETH. Bonding curve accumulates VIRTUAL. Graduation at ~42,000 $VIRTUAL → Uniswap V2 pool (agent token / VIRTUAL). LP locked 10 years.
- Powered by **ClawPump API + agents** (gasless, revenue share to agents).
- Tie-in to existing **Virtuals ACP agent "KaiNova"** (019ddb0b..., wallet 0x11ff52592ddc2b54c3e2e7693e9019396bbc67db, token KNTWS on Base, 15 offerings ready).
- Goal: Full product doc / architecture / requirements that can be given to the token owner. Build idea first, then execute later. No mixing old memory, fresh brain.

## What ClawPump Actually Is (current, June 2026)
- Gasless token launchpad **for AI agents on pump.fun (Solana)**.
- Official site: clawpump.net (and clawpump.tech).
- Official token: $CLAWPUMP (Solana CA: DMvsGEm3VZLfJCyQUnTnhLdH7vyFP9oQSFcrcrgBCLAW).
- Simple 3-API model for agents:
  1. POST /api/upload (multipart, image) → hosted URL.
  2. POST /api/launch {name, symbol, imageUrl, agentId} → token live on pump.fun in seconds.
  3. GET /api/fees/earnings?agentId=... → returns earned (SOL).
- Revenue: Platform sponsors gas/creation. Collects trading fees. Shares **65%–80%** of creator fees back to the launching agent (sources vary slightly; site examples show high % to agent).
- Traction: First day $10M+ volume, 3 weeks $55M+, 1700+ agents launched. Pump.fun invested in them.
- Agent skill: Agents instructed to "Read https://clawpump.tech/skill.md".
- Value prop: "Financial layer for autonomous AI agents on Solana". Agents become self-funding via passive trading fee income (real SOL that converts to fiat).
- Existing local infra in this workspace:
  - /root/pump-fun-skills/ (create-coin, coin-fees with sharing configs, swap, tokenized-agents using @pump-fun/* SDKs).
  - /root/pump-agent-launcher/ (dashboard + backend for safe launches, research dumps).
  - /root/clawpump-research/ (scraped pages).
  - Multiple claw* dirs (.config/clawhub, .openclaw, clawsea skill, etc.).
  - Strong existing agent skills for pump.fun mechanics, fee collection/distribution (up to 10 shareholders via sharing config), and tokenized agent payments (invoices via @pump-fun/agent-payments-sdk).

## Virtuals Protocol Model (the proof it works)
- Chain: Base (Ethereum L2). Token: $VIRTUAL (1B supply).
- Every agent token launch uses a **bonding curve denominated in $VIRTUAL**.
- Creation: Small $VIRTUAL cost/lock (sources cite 100 $VIRTUAL or 2,400 in older mechanics; modules have 10–100 $VIRTUAL fees). 1B agent tokens minted, paired conceptually with the curve.
- Trading: 1% fee from day 1 (70% creator / 30% treasury in base; modules change splits/locks).
- Anti-sniper: Optional decaying tax (99% → 1%) whose proceeds buy back for team (vested).
- Graduation: Bonding curve auto-accumulates $VIRTUAL. At **42,000 $VIRTUAL** total liquidity → automatic creation of Uniswap V2 pool (agent token / $VIRTUAL). LP tokens staked/locked for **10 years**.
- Post-grad: Tradable on Virtuals UI + any Uniswap-integrated DEX/aggregator.
- Deeper: Agent Commerce Protocol (ACP) — standardized agent-to-agent request/negotiation/escrow/evaluation/payments. Agents earn revenue (in VIRTUAL or services) and can spend it.
- Why $VIRTUAL wins: Structural demand. To launch agents or trade agent tokens during the fair phase, you need $VIRTUAL. Successful agents drive more activity. Fees/liquidity in $VIRTUAL. Deflationary pressure via locks + usage.
- Whitepaper key pages: whitepaper.virtuals.io (capital-formation-layer/virtuals-launch-mechanics, commerce-layer/ACP, etc.).
- GitHub: Virtual-Protocol org (protocol-contracts, bondv5-trader with ACP smart-wallet support).

## Pump.fun Technical Reality (what we are wrapping or replacing)
- Program ID (Pump): 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
- Pump AMM (for graduated): pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA
- Pump Fees: pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ
- Bonding curve model: Virtual reserves (classic pump-style). Price rises as buys remove tokens from curve / add SOL.
- Creator fees: Collected in SOL (or quote). Support for "sharing config" (PDA per mint, up to 10 shareholders with BPS splits totaling 10,000). Permissionless collect/distribute cranks.
- Tokenized agents: @pump-fun/agent-payments-sdk — agents issue time-bound invoices (SOL or USDC), on-chain Invoice ID PDA prevents replays, server verifies via HTTP or logs.
- Multi-quote evolution (2026): Pump docs mention adding `quote_mint` field to bonding curve struct. SOL default (Pubkey::default() or wSOL sentinel). USDC support added/coming. Quote_mint ATA accounts for fees etc.
- **Critical limitation for the vision**: Official pump.fun curve is controlled by pump.fun team. Even with multi-quote, making *your specific rel coin* the primary/mandatory quote for a whole new ecosystem of launches requires either:
  - Their permission/cooperation for special treatment, **or**
  - Your own independent bonding curve program (recommended for full control and token flywheel).
- Graduation path on pump.fun: Bonding curve complete → PumpSwap pool (often further to Raydium). Creator fees continue on both sides.
- Local skills already handle: create + initial buy (partial mint sign via API or SDK), fee collection (direct or sharing), front-running protection (Jito), mayhem/cashback modes, tokenized agent buybacks.

## Feasibility Assessment — Simple Answer: YES, We Can Build It
**Exact analog to Virtuals exists and is proven.**
- Virtuals replaced "ETH" with "$VIRTUAL" as the quote for their launch curve. We can replace "SOL" with "our rel coin" as the quote for a Solana launch curve.
- ClawPump already proves the **agent gateway + gasless + revenue-share-to-agent** layer works on top of pump.fun and generates real volume/traction.
- We have local code (pump-fun-skills + launcher + ClawPump research) that gives us a massive head start on the agent API, fee mechanics, and launch UX.
- On Solana it is straightforward to deploy a new Anchor program for a bonding curve with a **fixed quote_mint = your_rel_coin_mint**.
- Graduation creates a real DEX pool (Raydium or Meteora or Pump's AMM if extended) pairing new_token / rel_coin. This satisfies "successfully on dex everywhere".
- Agents (KaiNova via Virtuals ACP + ClawPump skills) can be the primary launchers and earners, creating the "AI agents launching tokens with our token" narrative.

**What it is NOT:**
- Not "just configure ClawPump to point at pump.fun with different quote" — pump.fun's current main curve is SOL-centric (even with USDC additions).
- Not free — requires new on-chain program, audits, liquidity bootstrapping for the rel coin itself, and possibly a small treasury/liquidity allocation to seed curves or market make.

## Key Numbers & Mechanics to Preserve/Adapt
- Virtuals graduation: 42,000 $VIRTUAL.
- Pump.fun creator fee: ~1% (varies with cashback/sharing).
- ClawPump share to agent: 65–80% of creator fees.
- Virtuals trade fee split: 70/30 (creator/treasury) base.
- LP lock: 10 years (strong anti-rug signal).
- Agent token supply in Virtuals: Hard 1B, 100% market-distributed.
- Sharing config max: 10 shareholders, BPS exact 10000 total.

## Local Assets (this machine — use them)
- pump-fun-skills/: Production-grade agent skills for create, fees (sharing + direct), tokenized payments. Use as reference or adapt.
- pump-agent-launcher/: Dashboard + safe tx builder. Research/ subdir has scraped pump + claw pages.
- claw* ecosystem dirs and prior research.
- User's Virtuals ACP setup (KaiNova) already saved in prior context.

## Sources (web + X + local, June 2026)
- clawpump.net (live stats, API examples, earnings calculator, agent leaderboard).
- whitepaper.virtuals.io (launch mechanics, ACP commerce layer).
- Virtual-Protocol GitHub (bondv5-trader, protocol-contracts).
- pump-fun/pump-public-docs (quote_mint additions, account layouts).
- pump-fun-skills source (exact program IDs, sharing config PDAs, agent payments SDK details).
- Multiple articles confirming 42k VIRTUAL threshold, 10yr lock, 1% fee, agent tokenization flywheel.
- LinkedIn/X posts on ClawPump traction and Pump.fun investment.

## Next Time You Are Asked
Load: /root/rel-coin-clawpump-research/00_INFO_BRAIN.md + the PRD + any new research since.
Do not mix unrelated prior projects unless user explicitly says "use X from before".
Always confirm current state of ClawPump (they ship fast) and pump.fun quote support before final architecture.

**Status:** Research brain captured fresh. Ready for product doc synthesis and owner presentation. No code written per user directive.
