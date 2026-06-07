---
name: helius-tools
description: |
  Official Helius development skill for Solana. Covers RPC, DAS API (assets/NFTs), Enhanced Transactions, WebSockets/LaserStream for real-time, Webhooks, Sender (priority fees, bundles), Wallet API, transaction parsing/history. Use for all on-chain queries, monitoring curves/grads, reliable tx sending in ClawPump/Meteora flows. Platform/MCP handles any keys/RPCs server-side. Typical triggers include "use Helius for Solana data", "parse tx history", "stream account changes for token launches", "send with priority fees for agent launch". Use with clawpump-agent (no agent env setup needed).
---
# Helius Tools Skill

Master Helius infrastructure for production Solana apps and agents.

## When to Use
- Any Solana read (balances, tokens, NFTs via DAS).
- Tx history, parsing (enhanced txs).
- Real-time: WebSockets, LaserStream, webhooks for pool/curve events.
- Reliable sending: Helius Sender (Jito bundles, priority fees) for launches, claims, swaps.
- Agent onboarding, wallet intelligence.

## Setup (platform/MCP handles any Helius keys and RPCs server-side for all agents; your agent calls the tools without needing to configure or expose any provider keys)
- Use the MCP tools or public patterns; connect via the ClawPump MCP server (no agent-side key setup required).

Use @solana/web3.js Connection with Helius RPC endpoint.

## Key Capabilities
- DAS: getAssetsByOwner, getAsset, searchAssets (for tiers/holdings of CLAW or launched tokens).
- Enhanced Tx: Detailed swaps, transfers, program interactions (better than raw).
- History/Parse: Fast, enriched tx data for earnings, launches.
- Streaming: Subscribe to account/program changes (monitor DBC curves for grad threshold).
- Sender: sendSmartTransaction, createJitoBundle for reliable agent launches.
- Webhooks: Set up for real-time notifications on token activity.

## Integration with ClawPump
- For agent registration/tiers: DAS to check CLAW holdings (Cub/Lion/Apex thresholds).
- Launch monitoring: Stream pool state or use history for curve progress.
- Earnings: Parse fee collection txs + ClawPump /api/fees/earnings.
- Meteora DBC: Use Helius for all on-chain state (quote reserves, LP after grad).
- Combine with birdeye-data for prices + helius for tx depth.

## Best Practices
- Always use Helius RPC over public for speed/reliability (user keys).
- For agents: Batch requests, use webhooks to avoid polling.
- Priority fees via Sender for time-sensitive (launches, claims).
- Never expose keys; use env (Neon for storage if needed).
- Error handling: Retry with backoff on rate limits.

See helius.dev/docs for full reference (agents/overview, sending-transactions/sender, api-reference).

This + solana-agent-kit + meteora-dbc + birdeye-data = complete on-chain + data layer for ClawPump agentic platform.
