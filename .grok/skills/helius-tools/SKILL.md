---
name: helius-tools
description: Official Helius development skill for Solana. Covers RPC, DAS API (assets/NFTs), Enhanced Transactions, WebSockets/LaserStream for real-time, Webhooks, Sender (priority fees, bundles), Wallet API, transaction parsing/history. Use for all on-chain queries, monitoring curves/grads, reliable tx sending in ClawPump/Meteora flows. Keys and RPCs provided by user. Typical triggers: "use Helius for Solana data", "parse tx history", "stream account changes for token launches", "send with priority fees for agent launch".
---
# Helius Tools Skill

Master Helius infrastructure for production Solana apps and agents.

## When to Use
- Any Solana read (balances, tokens, NFTs via DAS).
- Tx history, parsing (enhanced txs).
- Real-time: WebSockets, LaserStream, webhooks for pool/curve events.
- Reliable sending: Helius Sender (Jito bundles, priority fees) for launches, claims, swaps.
- Agent onboarding, wallet intelligence.

## Setup (project has keys)
- API Key: 9a468116-ce99-46d4-9adf-2568be3cf1b4
- RPC: https://mainnet.helius-rpc.com/?api-key=f67bb550-788a-439d-b6b7-18b9f0341b75 (and beta)
- Parse tx: https://api-mainnet.helius-rpc.com/v0/transactions/?api-key=...
- History: /v0/addresses/{address}/transactions/

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
