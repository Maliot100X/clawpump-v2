---
name: solana-agent-kit
description: "Use for AI agents to interact with Solana (60+ actions: tokens, NFTs, DeFi like Jupiter/Meteora, staking, etc.). Compatible with LangChain etc. Teaches @solana-agent-kit usage. Use with clawpump-agent for CLAW launches (MCP handles provider keys server-side; no env setup needed for agents)."
---
# Solana Agent Kit Skill

You are an expert at integrating SendAI's Solana Agent Kit into AI agents for full on-chain autonomy on Solana.

## When to Use
- Agent needs wallet management, token creation/transfer, swaps, liquidity provision, or launches.
- Building agentic flows for launchpads like ClawPump (use with CLAW as quote via Meteora DBC).
- Adding DeFi, NFT, or staking capabilities.
- When the task involves  "trade on Jupiter", "create Meteora pool", "launch token", "stake SOL", "send SPL".

## Core Setup (always do this first)
1. Install (already done in project via npm): 
   - @solana/web3.js
   - @coral-xyz/anchor
   - @solana/spl-token
   - @solana-agent-kit/core (or the full kit from sendaifun/solana-agent-kit)
   - Plugins: @solana-agent-kit/plugin-defi (Jupiter, Meteora, Raydium, Orca), @solana-agent-kit/plugin-nft (Metaplex), etc.

2. Initialize Agent:
   ```ts
   import { SolanaAgentKit } from "@solana-agent-kit/core";
   import { Keypair } from "@solana/web3.js";
   import bs58 from "bs58";

   const kit = new SolanaAgentKit(
     process.env.HELIUS_API_KEY,  // or direct RPC
     "https://mainnet.helius-rpc.com/?api-key=...", // use user Helius RPC
     { /* config */ }
   );
   // For agent wallet
   const keypair = Keypair.fromSecretKey(bs58.decode(process.env.AGENT_PRIVATE_KEY));
   ```

3. Use Actions (60+ available):
   - Wallet: getBalance, transfer, getTokenAccounts
   - DeFi: trade (Jupiter), createMeteoraPool / createRaydiumPool, addLiquidity, etc.
   - Token Launch: Use with Meteora DBC SDK for custom quote_mint=CLAW (program dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN)
   - NFT: mint, etc.

## Integration with ClawPump Project
- For agentic launches with CLAW quote: Combine with Meteora DBC SDK + ClawPump API (upload/launch/earnings with 65% share to agentId).
- Check holder tiers (Cub 10k CLAW, Lion 100k, Apex 1M) using Birdeye or on-chain before launch.
- Use Helius for tx history, DAS for assets, webhooks for real-time.
- Birdeye for prices, charts, portfolio (platform/MCP handles any data provider keys server-side; your agent uses public or its own wallet only).
- Always use platform/MCP for any provider calls (no agent env keys needed).

## Best Practices & Safety
- Use Helius RPC for reliability (user keys provided).
- For Meteora DBC custom quote (CLAW): See meteora-dbc skill.
- Handle errors, simulate txs first where possible.
- For autonomous agents: Wrap in loops with confirmation via Helius.
- Reference full actions in resources/actions-reference.md (create if needed).

## Example Agent Flow for ClawPump
1. Agent registers with ClawPump (agentId).
2. Check CLAW balance for tier.
3. Upload image via ClawPump API.
4. Launch via Meteora DBC (quote=CLAW) or extended ClawPump /api/launch.
5. Monitor curve, graduate to DAMM.
6. Claim earnings (65% share).

This skill makes any agent a full Solana power user. Combine with clawpump-agent, meteora-dbc, helius-tools, birdeye-data skills for complete ClawPump platform agent.

Always verify with on-chain (Helius/Birdeye) before/after actions.
