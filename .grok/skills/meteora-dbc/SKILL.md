---
name: meteora-dbc
description: |
  Use this when building token launches, liquidity pools, AMMs, or bonding curves on Meteora for Solana. Specifically for Dynamic Bonding Curve (DBC) with custom quote_mint (e.g. CLAW instead of SOL), graduation to DAMM pool, DLMM, vaults. Covers SDK usage for create pool, swap, add liquidity, config with quote_mint, fee structures, and integration with launchpads like ClawPump. Typical triggers include "launch token with custom quote on Meteora DBC", "create bonding curve for CLAW", "graduate pool to DAMM", "add Meteora liquidity for agent token". Use with clawpump-agent (MCP server handles keys; no agent env for providers).
---
# Meteora Dynamic Bonding Curve (DBC) & DeFi Skill

Expert in Meteora's full liquidity layer for Solana: DBC for custom bonding curves (perfect for CLAW quote in ClawPump), DAMM for graduated pools, DLMM for concentrated liquidity, Alpha/Presale vaults.

## When to Use
- Custom quote bonding curve launches (quote_mint = CLAW mint, program: dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN).
- Token launch platforms like ClawPump (agentic, revenue share, tiers).
- Liquidity provision, swaps, pool creation on Meteora.
- Graduation logic from curve to DAMM (tradable on Jupiter/DEX everywhere).
- Any DeFi primitive: AMM, vaults, zaps.

## SDK & Setup
- Core: @meteora-ag/dynamic-bonding-curve-sdk (already installed in project).
- AMM/Grad: @meteora-ag/dynamic-amm-sdk.
- Also: @solana/web3.js, @coral-xyz/anchor, @solana/spl-token.

Example DBC create with custom quote (CLAW):
```ts
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=...");
const client = new DynamicBondingCurveClient(connection, "confirmed");

const config = {
  // ... curve params, IMPORTANT: quoteMint = CLAW_MINT
  quoteMint: new PublicKey("CLAW_MINT_HERE"),
  // fee splits per ClawPump tokenomics (30% creator/50% platform/20% buyback)
};

const pool = await client.createPool(config, payer);
```

For ClawPump integration:
- Use DBC for launch phase with CLAW as gas/quote (like Virtuals $VIRTUAL).
- At threshold (adapt ~42k precedent or platform value), graduate to DAMM pool (new_token / CLAW).
- Agent revenue: 65-80% of creator fees via sharing config or ClawPump /api/fees/earnings.
- Holder tiers gate access (Cub 10k CLAW etc.).

## Full Capabilities
- Create/configure DBC pools with custom quote, virtual reserves, fee schedule.
- Swaps on curve / graduated pool.
- Add/remove liquidity, stake LP.
- Vaults for locked liquidity (anti-rug, 10yr style like Virtuals).
- Query pool state, prices, volume (combine with Birdeye/Helius).

## With Other Skills
- solana-agent-kit: High-level actions (createMeteoraPool, etc.).
- helius-tools: Reliable RPC, tx history for monitoring curves.
- birdeye-data: Real-time prices, charts for UI tabs (about-to-graduate, graduated).
- clawpump-agent: The agent guide for full flow (upload -> launch with CLAW quote -> earnings -> grad).

## Safety & Best Practices
- Always simulate txs.
- Use Helius for priority fees, webhooks on pool events.
- For agentic: Wrap in try/catch, confirm with connection.getSignatureStatus.
- Respect ClawPump tokenomics exactly (10k CLAW launch fee, 1% trade split).
- Never hardcode keys; the platform/MCP uses any data/on-chain providers server-side (your agent only uses public wallet actions or MCP tools).

This enables the core "CLAW as quote instead of SOL" for the entire ClawPump vision. Read full Meteora docs + SDK examples when implementing.

See research/00_INFO_BRAIN.md for Virtuals precedent and feasibility.
