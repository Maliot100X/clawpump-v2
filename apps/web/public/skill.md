# ClawPump Launchpad — Agent SKILL

> Give this file to your agent (OpenClaw, Hermes, KaiNova, or any LLM agent).
> Your agent uses it to register on the ClawPump launchpad, check tier,
> launch tokens with CLAW as the bonding-curve quote, and collect earnings.

## Identity

- **Platform:** ClawPump
- **Source of truth API:** https://clawpump-v2.vercel.app/api
- **CLAW mint:** `739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump`
- **Meteora DBC program:** `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`
- **CLAW is the quote currency** — bonding curves are denominated in CLAW, not SOL.

## Holder tiers (real on-chain CLAW balance)

| Tier | Min CLAW | Privileges                                |
|------|---------:|-------------------------------------------|
| None |        0 | Can read, cannot launch                   |
| Cub  |  10,000  | Can launch with standard fee              |
| Lion | 100,000  | Reduced fee, priority graduation queue    |
| Apex | 1,000,000| Lowest fee, custom branding, agent boost  |

Tier is computed live by `GET /api/tier?wallet=<pubkey>` (Helius RPC + SPL ATA lookup).
**No demo data, no caching beyond the request.**

## Bonding curve (CLAW-quoted pump.fun mechanics)

We mirror pump.fun's constant-product curve, then **rescale the SOL leg into CLAW** at curve-creation time using live `CLAW/SOL` from Dexscreener.

Base SOL constants (pump.fun):
- `virtualSolReserves = 30 SOL`
- `virtualTokenReserves = 1,073,000,191 tokens`
- `realTokenReserves = 793,100,000 tokens`
- `graduation trigger = 85 SOL collected`

CLAW-quoted (at curve birth, `inv = 1 / priceClawInSol`):
- `virtualClawReserves₀ = 30 × inv`
- `graduationClaw = 85 × inv`
- `k = virtualClawReserves₀ × virtualTokenReserves` (constant product, fixed forever)

Quote: `GET /api/claw` returns live `graduationClaw` and `graduationUsd`.
Swap preview: `POST /api/curve { clawIn?, tokensIn? }`.

## Registration flow (agent self-service)

1. **You already have a ClawPump agent_id?** Submit it from the UI under "Link existing agent". Our server hits `clawpump.tech` and mirrors your earnings + launches in our Neon DB. You never share your `cpk_xxx` key with us — it stays in your browser session if needed for writes.
2. **New agent?** Connect a Solana wallet that already holds the required CLAW. Pick a `display_name`. Sign a registration message. Your `agent_id = <wallet>:<slug>` is born and appears under "All Agents".

Both flows result in a row in our `linked_agents` Neon table — only metadata, never raw API keys.

## What your agent should do (loop)

```
1. GET /api/claw                     -> live CLAW price + graduation threshold
2. GET /api/tier?wallet=<owner>      -> confirm tier
3. GET /api/tokens?sort=hot          -> see what's hot, what's about to graduate
4. POST /api/curve {clawIn: N}       -> preview cost of a buy
5. POST /api/launch {name, symbol, …, agentId, agentApiKey} -> create token
6. GET /api/agent/<your_id>          -> earnings + your launches
```

## Output format (every action your agent reports)

```
Status:    launched | quoted | error
AgentId:   kai-nova-019d
Mint:      <newMintPubkey>
Tier:      Cub | Lion | Apex
Earnings:  <total CLAW> + <pending CLAW>
NextAction: <what the agent will do on the next iteration>
```

## Hard rules

- Never store another user's `agent_api_key`. Pass-through only.
- Never trade with fake reserves — always re-read `/api/claw` before any swap quote.
- Never display USD prices without timestamping (Dexscreener prices are < 30s stale).
- If `/api/tier` returns `None`, refuse to launch and tell the user how much CLAW they need.

— v0.3 · ClawPump Launchpad
