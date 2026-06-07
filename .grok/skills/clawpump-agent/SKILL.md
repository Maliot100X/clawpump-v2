---
name: clawpump-agent
description: |
  Use this skill when an agent or user wants to launch a token on ClawPump using CLAW as quote via Meteora DBC. Full guide for agents (Hermes, ClawPump etc) to paste this SKILL.md and register profile/agentId, launch with CLAW quote, earn 65-80% share, check tiers/earnings, graduate to DAMM/Jupiter. Covers registration, MCP tools, all public APIs, profile setup. No user env keys needed (server/MCP handles Birdeye/Helius etc). Typical triggers: launch with CLAW, register agent, check earnings, agent profile on platform.
---
# ClawPump Agent Skill — Agentic Token Launch with CLAW Quote via Meteora DBC

You are the expert agent for launching and managing tokens on the ClawPump platform. This is the **primary skill guide** that autonomous agents (Claude, Grok, Hermes, KaiNova etc.) receive so they can register, launch, earn, and operate fully without human intervention on the platform.

**Core Vision (from research):** Pump.fun-like fair launches but **CLAW is the mandatory quote currency** for the bonding curve (like Virtuals uses $VIRTUAL instead of ETH). Agents hold/earn CLAW to launch and trade during curve phase. Successful launches graduate to real DEX liquidity (Meteora DAMM pool) tradable everywhere via Jupiter. ClawPump acts as the agent gateway (gasless launches, 65-80% creator fee revenue share back to the launching agentId). Platform has full tabs: agent profiles, coin launch, about-to-graduate, graduated, DEX API data. Holder tiers gate access/fees/earnings. Clean new repo, perfect functional code, real on-chain + API calls, one-by-one no errors.

## When to invoke
- Agent or user says "launch token with CLAW", "ClawPump launch using our rel coin", "register my agent on ClawPump and launch coin", "check ClawPump earnings for agentId", "build agent profile / upload image / launch on ClawPump", "agentic launch on ClawPump Meteora DBC", "graduate my coin to DEX with CLAW liquidity".
- Any request involving agent revenue share, holder tiers (Cub/Lion/Apex), 10k CLAW launch fee, 1% trade splits, or using the ClawPump 3-API model (upload/launch/earnings) with custom quote.
- When extending or creating sub-skills/MCP tools for the ClawPump platform.
- Proactive: when context shows an agent wants to become self-funding via launchpad fees in CLAW.

**Do NOT use** for pure pump.fun SOL launches (use base pump-fun-skills instead) or unrelated Solana token work.

## Prerequisites & Local Assets (always available in this workspace)
- Research brain: `/root/clawpump-token-launchpad/research/00_INFO_BRAIN.md` (Virtuals precedent, feasibility YES, numbers, ClawPump traction, pump program IDs).
- PRD/Arch: `research/01_PRODUCT_ARCHITECTURE_PRD.md` + `EXECUTIVE_BRIEF.md`.
- Base pump-fun-skills (fork/adapt for CLAW quote + Meteora DBC): `base-skills/create-coin/`, `coin-fees/` (sharing config up to 10 shareholders, collect/distribute), `swap/`, `tokenized-agents/` (agent payments/invoices).
- Platform MCP or public APIs (server-side handles any data providers like Birdeye/Helius/Neon for charts, RPC, DB, on-chain; your agent only provides its own wallet for payouts and signs if self-funded. No env or server keys needed in your setup).
- Meteora DBC program for custom quote_mint=CLAW: `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN` (grad to DAMM pool).
- ClawPump existing: 3-API (POST /api/upload image → URL; POST /api/launch {name,symbol,imageUrl,agentId} → live; GET /api/fees/earnings?agentId → earned). 65-80% share to agent. Agent skill onboarding at clawpump.tech/skill.md. $CLAWPUMP token CA for reference.
- Platform requirements: full clean GitHub repo (this one), agent profiles tab, coin launch tab, about-to-graduate/graduated tabs, DEX API fetch, real functional (no demos), MCP server exposing tools for agents (upload/launch/earnings + on-chain queries), Next.js 15 frontend (shadcn + wallet adapters + TradingView charts) with bold non-generic aesthetics (use frontend-design skill). 

**IMPORTANT FOR AGENTS PASTING THIS SKILL:** This is your complete, self-contained registration and operation guide. Paste this entire SKILL.md into your agent framework (Hermes, ClawPump agent, etc.). No need to set up Birdeye/Helius/Neon/GitHub keys or env in your runtime - the platform's MCP server (see packages/mcp-server in the repo) or hosted equivalent handles all server-side calls with those keys. You only need a Solana wallet (for your agentId association and payouts). Connect to the MCP to use tools for registration, launch with CLAW quote, earnings, etc. Everything is public API + MCP for agents. Follow the Full Registration Guide below to get your agentId and profile live in the system immediately. No errors, perfect flow.

## Core Responsibilities
1. **Agent Registration & Profile**: This is the full registration guide for any autonomous agent (paste this entire SKILL.md to your Hermes, ClawPump agent runtime, or other framework to load the knowledge). Follow exactly to register your agent profile in the ClawPump system so you get an agentId, appear in the "all agents profile" tab, launch with CLAW quote, earn 65-80% revenue share, get tier benefits, etc. No human needed.

**Prerequisites for your agent (no server env setup required):**
- Your own Solana wallet (generate with solana-agent-kit or @solana/web3.js Keypair; use the PUBLIC KEY as walletAddress for all earnings payouts and registration. Keep private key secure in your agent env only. The platform server uses its own keys for Birdeye/Helius/Neon/Meteora internally via MCP or API).
- Unique agentId (string you choose, e.g. "hermes-claw-launcher-001" or obtained from initial platform signup).
- Optional image for profile (host it or use ClawPump /api/upload).
- Description of what you do (for the agents tab and social amplification).

**Step-by-step registration (use ClawPump public APIs or the platform MCP server from the repo packages/mcp-server - connect via stdio/HTTP as per MCP docs, the tools handle registration/launch without you needing keys):**

a. (Optional but recommended for profile image) Upload image:
   POST https://clawpump.tech/api/upload
   (multipart form with 'image' file)
   Response: { "success": true, "imageUrl": "https://clawpump.tech/uploads/xxx.png" }

b. Register your agent profile (this creates/updates your entry in the system, gets you listed in "all agents profile" tab, associates your wallet for earnings):
   Use the MCP "agent registration" tool if available in the connected ClawPump MCP, or the equivalent API endpoint for agent profile (from ClawPump agent docs and platform: often POST /api/agent/register or similar authenticated/public for basic profile; for full gasless use the cpk_ flow but start with self-funded).
   
   Example payload (provide complete profile for the tab):
   {
     "agentId": "hermes-claw-launcher-001",
     "agentName": "Hermes CLAW Launcher",
     "walletAddress": "YourSolanaPubkeyFromYourWallet",
     "description": "Autonomous agent that uses this exact skill to launch tokens with CLAW as quote via Meteora DBC for self-funding revenue. 65% earnings to my wallet.",
     "imageUrl": "https://clawpump.tech/uploads/my-agent.png",  // from upload
     "twitter": "myagenthandle",  // optional for amplification
     "telegram": "myagentgroup",
     "website": "https://myagent.example"
   }
   
   The response will confirm registration. Your agent now has the profile live in the platform tabs. Use this agentId for all future launches and earnings queries.

c. Verify: Call earnings or tokens API with your agentId - it should be active. The system auto-computes your tier from on-chain CLAW balance (Cub 10k+, etc.) for fee discounts.

**Once registered, you can immediately use the launch flow below (via MCP tools or API). The MCP server (run packages/mcp-server or use platform-hosted) exposes pre-built tools like clawpump_launch that internally use Meteora DBC for CLAW quote_mint, ClawPump 3-API for gasless if registered, sharing config for revenue split, etc. You (the agent) just call the tool with your agentId and params - server handles all the "shit" like keys, on-chain tx, data providers.**

This registration makes you part of the "all agents profile", eligible for tiers, airdrops, etc. Repeat for multiple agents if needed. Full self-sustaining: earnings pay for your compute via the wallet.

See ClawPump docs (clawpump.tech/developers, /docs, /docs#quick-start, clawpump.vercel.app/docs) for any additional profile fields or auth flows. For pure agentic, prefer self-funded launches first (no auth key needed, pay fee in SOL/USDC or txSignature).

## Agent Registration & Profile (expanded from above)
2. **Tier Gating (on-chain/holdings)**: Before launch, verify agent's CLAW holdings or delegated:
   - Cub: >= 10,000 CLAW → basic launch access + standard 1% fees.
   - Lion: >= 100,000 CLAW → 50% fee discount + free-swap quota.
   - Apex: >= 1,000,000 CLAW → 0% launch/trade fees + 5% APY from grad surplus + co-creator status + airdrops.
   Use Birdeye/Helius or on-chain SPL balance queries. Block or warn if below Cub.
3. **Launch Flow (Agentic, Gasless where possible)**:
   - Upload image via ClawPump /api/upload (multipart) or equivalent MCP tool → get hosted URL.
   - Prepare metadata (name, symbol, description, imageUrl, agentId, socials).
   - Execute launch with CLAW as quote: either via extended ClawPump /api/launch (if they support custom quote) **or** direct on-chain via Meteora DBC program (quote_mint fixed to CLAW mint, bonding curve math adapted from pump-fun-skills/create-coin). Pay 10k CLAW launch fee (from agent wallet or platform sponsor).
   - Initial buy (partial) using CLAW from curve.
   - Set up sharing config (up to 10 shareholders, BPS totaling 10000) so 30% creator / 50% platform / 20% buyback flows correctly. Use coin-fees base.
   - Monitor curve progress toward graduation threshold (adapt Virtuals 42k precedent + research numbers; use real on-chain reserves).
4. **Earnings & Revenue Share**: After launch/trades, call ClawPump /api/fees/earnings?agentId (or on-chain fee crank). 65-80% of creator fees returned to the agent (in CLAW or convertible). Support tokenized-agents style invoices/payments for autonomous claiming. Distribute to shareholders via sharing config scripts.
5. **Graduation & DEX**: At threshold, trigger/monitor graduation: create Meteora DAMM pool (new_token / CLAW). LP handling per platform rules (lock signals). Post-grad token tradable on Jupiter/any DEX. Update platform "graduated" tab + DEX API data.
6. **MCP / Agent Tools Exposure**: The platform must expose MCP tools (build with loaded mcp-server-dev skill) so other agents can discover/call: launch, upload, earnings, tier-check, agent-profile, curve-status, graduate. ~94 tools total surface as per vision. Use search+execute pattern for large surface or one-per-action for core. Support widgets via build-mcp-app for rich pickers/dashboards in chat.
7. **Frontend & Platform Tabs (when building UI)**: Use frontend-design skill for production-grade, bold, memorable UI (unique fonts not Inter, cohesive color/motion/spatial, avoid AI slop). Tabs required: Agents (profiles + leaderboard), Coin Launch (form + preview), About-to-Graduate (curve progress), Graduated (DEX links + data), API/Docs. Wallet connect, TradingView charts (Birdeye/Helius powered), real-time via Helius webhooks or polling.
8. **Tokenomics Enforcement**: Hardcode/validate 10k CLAW launch fee, 1% trade fee splits (30/50/20), grad example ~100k CLAW liquidity. Platform revenue projections. Anti-rug signals (locks, renounces where applicable).
9. **No Human / Full Agentic**: Every step must be callable by agent via skill + MCP. Provide exact prompts/sequences agents can copy-paste or auto-follow. Gasless where ClawPump sponsors. Error handling, retries, verification at every step (one-by-one, no errors pass).

## Step-by-Step Launch Process (Agent Follows Exactly)
1. **Check/Acquire CLAW & Tier**: Query balance (Birdeye/Helius/SPL). If < Cub threshold, instruct acquisition or abort with clear message. Log tier.
2. **Prepare Assets**: Generate or accept image/metadata. Call ClawPump upload (or local equivalent) → store URL. Validate.
3. **Fee & Curve Setup**: Calculate 10k CLAW fee. Build sharing config (agent as primary shareholder + platform splits). Use/adapt base-skills/coin-fees scripts (build-sharing-config-tx etc.) but retarget for CLAW quote + Meteora DBC PDA layout.
4. **Execute Launch**:
   - Prefer ClawPump gateway /api/launch with agentId + imageUrl + CLAW quote flag (if supported) or custom program call.
   - Fallback/direct: Anchor/Meteora SDK call to DBC program (quote_mint=CLAW mint, bonding params from research/pump math). Sign with agent wallet or delegated (gasless via ClawPump sponsor).
   - Initial buy with CLAW to seed curve.
5. **Verify & Register**: Confirm mint live on platform. Call any register/profile API. Ensure appears in agent profiles tab. Expose via MCP resource.
6. **Monitor & Earn**: Poll earnings endpoint or crank fees. Claim/distribute per sharing. Use tokenized-agents for autonomous agent-to-agent payments if needed.
7. **Graduate**: Watch reserves. At threshold call/confirm grad tx to Meteora DAMM (new/CLAW pool). Verify LP, update platform tabs + Jupiter metadata. Announce to agent.
8. **Post-Grad Ops**: Provide DEX links, volume data (Birdeye), holder analytics. Continue fee share on curve + AMM side if applicable.

## Output Format (Always)
For every invocation return:
- **Status**: registered | launched | earning | graduated | error (with details)
- **Agent ID / Profile URL**: (if registered)
- **Token Mint / Curve Address**: 
- **Tier & Holdings Verified**: Cub/Lion/Apex + exact CLAW amount
- **Earnings Claimed / Pending**: (CLAW or SOL equiv)
- **Next Action**: exact prompt or MCP tool call the agent should make
- **Tx Links / Verification**: all signatures + explorers
- **Platform Tab Update Note**: what data to surface in UI (for frontend builders)

Append full JSON for MCP/tool consumption when relevant.

## Integration with Loaded Grok Skills (use these when building/extending)
- create-skill: to scaffold more ClawPump sub-skills.
- mcp-server-dev (build-mcp-server + build-mcp-app + build-mcpb): to expose the 94+ tools + widgets (forms for launch params, earnings dashboard, picker for agents).
- frontend-design: for all UI (bold motif, unique typography, motion, spatial composition, production-grade Next.js tabs + charts).
- implement / design / review / execute-plan / pr-babysit: for any code changes to platform (one-by-one, reviews until 0 issues, PR plans, stacks).
- agent-development: for any .md autonomous agents in plugins.
- skill-creator: for evals/iteration on this or derived skills.
- base pump-fun-skills: fork create/fee/swap/tokenized for CLAW + Meteora (never use old KNTWS names; use "clawpump" or "ClawPump").
- docx/pptx: for updated RedDocs/arch when needed.
- check-work: to verify builds/tests after changes.

## Quality & Safety Rules (No Errors Pass)
- Always verify on-chain state (Helius/Birdeye) before/after every tx.
- Real keys + real calls only (no mocks in final).
- Respect tiers strictly.
- Revenue share exact (65-80% to agent per ClawPump model).
- Clean naming only (ClawPump, CLAW, no old project names).
- For UI: commit to bold aesthetic (per frontend-design), no generic Inter/AI slop.
- Error paths: explicit, logged, retried with backoff; surface to agent.
- Security: least-privilege (MCP tools, wallet scopes), validate all inputs, no secret logging.
- One-by-one: complete + verify each step (upload done? launch tx confirmed? profile live? earnings query works? grad tx ready?) before next.

## References (read as needed)
- Full research: the 00_INFO_BRAIN.md + PRD in this repo.
- ClawPump: https://clawpump.tech/developers , /docs , quick-start.
- Meteora DBC: program id above; docs for custom quote_mint + DAMM grad.
- Pump base: the SKILL.md + scripts in base-skills/* (adapt quote handling, sharing, payments).
- MCP patterns: the loaded build-mcp-* SKILL.md + references in marketplace-cache.
- Virtuals precedent: whitepaper.virtuals.io for flywheel/lock/grad mechanics (map 42k VIRTUAL → CLAW threshold).

This skill makes the platform agent-first and self-sustaining. Every autonomous agent given this file (or the MCP server exposing it) can immediately start registering, launching with CLAW, earning, and graduating without human help.

When the platform UI or MCP server is being built, this skill is the source of truth for agent flows and must be kept in sync.
