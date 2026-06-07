---
name: birdeye-data
description: Birdeye API skill for real-time Solana (and EVM) token data. Prices, OHLCV charts, market discovery, wallet portfolio/P&L, trader intelligence, live streams. Key provided. Use for frontend tabs (charts, about-to-graduate progress, graduated DEX data), agent tier checks via prices/holdings, ClawPump UI. Typical triggers: "get token price/chart", "portfolio P&L", "top traders", "market data for launchpad".
---
# Birdeye Data Skill

Expert at Birdeye's comprehensive market data API for Solana.

## When to Use
- Real-time prices, volume, liquidity for any token (including launched on ClawPump/Meteora).
- Charts (TradingView style for frontend).
- Wallet portfolio, P&L, token holdings (for CLAW tier verification: 10k/100k/1M).
- Market discovery, top gainers, trader intel.
- Live data for "about to graduate" / "graduated" tabs, DEX API section.

## Setup
- API Key: 816325a6003540e59f439b9d578d3ad7 (header: x-api-key)
- Docs: https://docs.birdeye.so/reference
- Base: https://public-api.birdeye.so (or pro endpoints)

Common endpoints (use fetch with key):
- /defi/price?address=...
- /defi/history_price (OHLCV)
- /defi/token_overview
- /defi/v3/token/holder
- /defi/v3/token/trade
- Wallet: /v1/wallet/token_list, /v1/wallet/portfolio

## Integration with ClawPump
- Frontend: Power TradingView charts, real-time prices in launch/grad tabs.
- Agentic: Check effective CLAW value for tier (Cub etc.) before allowing launch (10k CLAW fee, discounts at higher).
- Post-grad: Jupiter tradable data + Birdeye for volume/MC in "graduated" tab.
- Combine with Helius (tx depth) + Meteora SDK (on-chain state) + Solana Agent Kit (actions).

## Best Practices
- Cache responses where possible (data changes fast but not every ms).
- Use for UI only or agent queries; respect rate limits.
- For agents: Combine with solana-agent-kit for on-chain actions after seeing Birdeye signal.
- Exact key usage: Never log, use env.

Example:
```ts
const res = await fetch(`https://public-api.birdeye.so/defi/price?address=${mint}`, {
  headers: { "x-api-key": process.env.BIRDEYE_API_KEY }
});
```

This skill + others makes the full data layer for the agent-first ClawPump platform with CLAW quote.
