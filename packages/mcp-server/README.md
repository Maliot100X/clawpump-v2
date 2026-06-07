# @clawpump/mcp-server

Minimal production skeleton for ClawPump MCP (streamable HTTP) per mcp-server-dev + build-mcp-app patterns + clawpump-agent skill.

## Tools (core, one-per-action, extensible to ~94)
- clawpump_upload
- clawpump_launch (CLAW quote + Meteora DBC + agentId + 10k fee + tier gate)
- clawpump_earnings (65-80% share)
- clawpump_check_tier (Cub 10k / Lion 100k / Apex 1M CLAW exact)
- clawpump_agent_profile
- curve_status
- graduate_trigger

## Widgets (ui:// + _meta.ui for rich clients)
- ui://clawpump/launch-form
- ui://clawpump/earnings-dashboard
- ui://clawpump/agent-leaderboard

## Run
From repo root:
- `npm run dev:mcp` (uses tsx watch)
- or `cd packages/mcp-server && npm run dev`
- MCP: http://localhost:3333/mcp
- Discovery: http://localhost:3333/tools

Uses exact keys from root .env (BIRDEYE, HELIUS, CLAWPUMP_API, METEORA_DBC_PROGRAM_ID).

Integrates real ClawPump 3-API calls (stubs + live fetch patterns for first slice), Birdeye tier, Helius ready.

**Agentic**: Give agents the .grok/skills/clawpump-agent/SKILL.md + point MCP here. Full no-human flows.

See root README + research/ for PRD numbers, base-skills/ for future on-chain (create-coin/coin-fees).
