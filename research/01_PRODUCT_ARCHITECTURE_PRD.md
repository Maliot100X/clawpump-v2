# ClawPump RelCoin Launchpad — Virtuals-Style Custom-Quote Token Launch Platform on Solana
**Product Requirements + Technical Architecture + Implementation Spec**

**Prepared for:** Solxhunter X100 / token owner (KaiNova Virtuals ACP context)  
**Date:** 2026-06-07  
**Status:** Research complete. Idea documented. Ready for owner review + decision before any code.  
**Core Principle:** Build the idea first. Full transparency on what must be built, why it works (Virtuals proof), what we already have (ClawPump + local skills), and the real engineering path.

---

## 1. Executive Summary + Simple Answer

**The ask (paraphrased):** Can we build a pump.fun-like fair launch platform where the bonding curve and all activity during the launch phase uses **our rel coin** (custom SPL token) as the quote currency instead of SOL — exactly like Virtuals uses $VIRTUAL instead of ETH/Base — and where ClawPump (our agent API/gateway) is the primary way agents and users launch and earn, with successful tokens graduating to real DEX liquidity (Raydium etc.) everywhere?

**Simple answer: YES. It is possible and the model is already proven by Virtuals Protocol.**

**Virtuals proof:**
- They run a massively successful agent token launchpad on Base.
- Bonding curves are priced in and accumulate **$VIRTUAL** (not ETH).
- Agents/creators need $VIRTUAL to launch and to buy early.
- At a fixed threshold (~42,000 $VIRTUAL) the curve graduates to a Uniswap V2 pool (new agent token / $VIRTUAL).
- LP locked 10 years.
- 1% trading fees flow (mostly) back to creators + protocol.
- This creates relentless structural demand for $VIRTUAL.
- Combined with their Agent Commerce Protocol (ACP), tokenized agents earn revenue and can spend it autonomously.

**What we can do on Solana with ClawPump:**
- Today ClawPump is an excellent **gasless agent gateway** that wraps pump.fun (SOL curve) and shares 65-80% of creator fees back to the launching agent.
- We already have deep local capabilities (pump-fun-skills for creation/fees/tokenized payments, pump-agent-launcher, prior ClawPump research).
- To achieve the "our token as quote" flywheel, we extend the model:
  - Deploy a **new custom bonding curve program** on Solana where the quote mint is fixed to (or defaults to) **our rel coin**.
  - Extend the ClawPump API + agent skill so launches are "pay with our rel coin" (gasless or low-friction for agents).
  - Graduation logic creates a real DEX pool (new token / our rel coin) on Raydium/Meteora/Pump AMM.
  - Fees during curve phase captured in our rel coin → distributed via sharing configs or direct to agents/creators/platform.
  - Agents (including the existing KaiNova on Virtuals ACP) become the primary power users and earners, reinforcing the agent economy narrative.

**Why this is bigger than "just another launchpad":**
- It turns the rel coin into the "picks and shovels" for an entire agent-powered memecoin/agent-token economy on Solana.
- Every launch requires acquiring/holding the rel coin.
- Trading on curves requires the rel coin.
- Post-grad liquidity is paired against the rel coin (deeper utility + potential for ecosystem DEX fees or further products).
- Agent revenue share in the rel coin creates a closed loop: agents earn the token → use it to launch more or pay for services → more demand.

**What this document delivers:**
- Full requirements (what "success" looks like for the owner).
- Architecture (on-chain + gateway + agent layer).
- Comparison of current ClawPump vs desired state vs Virtuals.
- Phased implementation plan that reuses everything we already have.
- Risks, audits needed, open decisions.
- Clear "what to build next" so the owner can decide investment/priority.

**Explicit: No production code, no new contracts, no deployment has been written in this session.** Research + documentation only, per user directive ("dont code nothing... build idea first then we try").

---

## 2. Current State Snapshot (June 2026)

### ClawPump (what we have today)
- Gasless launches for AI agents directly onto pump.fun (SOL bonding curve).
- 3-call API + hosted images.
- Strong revenue share back to agentId (65-80% of creator fees).
- Official $CLAWPUMP token on Solana.
- High early traction + Pump.fun investment signal.
- Agent skill.md onboarding.
- Local supporting code: full pump.fun create/fee/tokenized-agent skills + launcher dashboard.

**Limitation for the vision:** Everything funnels through pump.fun's SOL (or limited multi-quote) curve. We cannot force "buy with our rel coin" inside their program without their cooperation or a parallel system.

### pump.fun Protocol
- Mature, high-volume fair launch machine.
- Bonding curve → Pump AMM (often Raydium).
- Creator fee infrastructure with sharing configs (up to 10 shareholders, exact BPS).
- Tokenized agent payments SDK (invoices, on-chain verification).
- Evolving multi-quote support (quote_mint field added; SOL primary, USDC support).
- Program is not ours to customize for a specific team's token as the universal quote.

### Virtuals Protocol (the benchmark)
- Agent tokenization + capital formation layer.
- $VIRTUAL is the quote asset for bonding curves.
- Clear graduation threshold + auto DEX migration + long LP lock.
- Fee splits + anti-sniper mechanics.
- ACP for real agent-to-agent commerce (the "marketplace where agents hire agents").
- Result: $VIRTUAL has structural demand from every launch and trade.

### Our Position
- We have the **agent gateway expertise** (ClawPump) + **pump.fun integration depth** (local skills) + **Virtuals ACP agent** (KaiNova) already running.
- Missing piece for the flywheel: the custom-quote bonding curve layer denominated in the rel coin, with ClawPump as the friendly agent front door.

---

## 3. Vision & Success Definition

**Product name ideas (to be decided):** RelPump, ClawCurve, KaiLaunch, TokenForge (Solana edition), AgentPump (our rel coin), etc. Use placeholder "ClawRel Launch" or "RelCoin Pump" for now.

**North Star:** Every meaningful agent-driven or community-driven token launch on our platform requires and consumes our rel coin during the fair launch phase, creating sustainable demand, fee revenue in the rel coin, and graduated liquidity paired against it.

**For agents (primary users):**
- Launch a token paying only (or primarily) in the rel coin.
- Zero or sponsored gas for the agent.
- Automatic high % of trading fees (in rel coin or convertible) flows back to the agent wallet/offerings.
- Earnings usable inside the broader agent economy (Virtuals ACP or equivalent).

**For the rel coin holder / ecosystem:**
- Buy pressure from launch activity.
- Trading activity on curves.
- Post-grad pools provide ongoing utility (pairs, potential for single-sided or ecosystem incentives later).
- Platform/protocol fees in the rel coin.

**Success metrics (examples — owner to set targets):**
- Number of launches per week/month using the rel-coin curve.
- % of total agent launches on Solana captured.
- Cumulative rel coin volume through curves (locked + traded).
- Agent earnings distributed (in rel coin or SOL equivalent).
- Time-to-graduation for successful launches.
- Post-grad liquidity depth and retention (no immediate rugs).
- Agent retention / repeat launches.

---

## 4. High-Level Architecture

### 4.1 Layers
1. **On-Chain Core (new)**
   - Custom Solana program: "RelCurve" or "ClawBond" (Anchor/Rust).
   - State: Global config (quote_mint = our rel coin mint, fee params, graduation threshold in quote tokens, platform treasury, etc.).
   - Per-launch accounts: Bonding curve PDA (holds virtual reserves of quote token + token supply), associated quote accounts, etc.
   - Instructions (high level):
     - `create` (mint new token + initialize curve with metadata; requires quote token payment or lock for creation fee).
     - `buy` (user/agent sends our rel coin → receives new token at curve price; updates reserves).
     - `sell` (reverse).
     - `graduate` (when quote reserves >= threshold: create Raydium/Meteora pool with accumulated quote + remaining tokens, handle LP tokens according to policy — lock, burn, or platform-controlled with vesting).
     - Fee collection / distribution (integrate or mirror pump.fun sharing config pattern so agents can be shareholders).
   - Security: Standard bonding curve invariants, no mint authority after creation (or controlled), rent, etc. Full audit required.

2. **Gateway / API Layer (extend ClawPump)**
   - Keep the simple 3-call experience (upload, launch, earnings).
   - New/parallel endpoint or flag: `quote_mode: "rel_coin"` or dedicated `/api/launch-rel`.
   - The gateway sponsors gas or accepts small rel coin top-up.
   - Internally: builds tx for the new program (or uses a relayer/partial-sign pattern like current pump skills).
   - Earnings dashboard now shows rel coin (and perhaps auto-swaps or reports in SOL/USD for agent convenience).
   - Image hosting, metadata, social hooks remain.

3. **Agent Skill & Integration Layer**
   - Update/provide new `skill.md` (or extended version) that tells agents exactly how to launch with the rel coin, check earnings in rel coin, etc.
   - Deep integration with existing pump-fun-skills patterns (reuse fee sharing, tokenized payments).
   - Bridge to Virtuals ACP: Agents running on KaiNova / Virtuals can discover the ClawPump skill and use their Base $KNTWS or bridged rel coin holdings, or acquire rel coin on Solana to launch.
   - Future: Agents can use earnings in rel coin to pay other ACP services or Solana services.

4. **Liquidity & DEX Graduation**
   - Target: Raydium (or Meteora DAMM / Pump AMM extension) pool = new_token / our_rel_coin.
   - LP token handling: Recommend 10-year style lock (or equivalent on Solana — locked LP vaults, or burn + protocol-owned). This is a major trust signal.
   - Post-grad trading: Users/agents can trade the new token directly against the rel coin on DEXes. This gives the rel coin real pair utility.

5. **Off-Chain / Ops / Frontend**
   - Leaderboards (top earning agents, top mcap launches on the rel curve).
   - Analytics (volume through curve, fees captured, graduation success rate).
   - Crankers / keepers for graduation and fee distribution (permissionless where possible, like pump fees).
   - Admin controls for params, treasury claims.
   - Optional: Simple web UI for humans + agent-first API/docs.

### 4.2 Data / Account Sketch (high level, not code)
- Global: quote_mint, graduation_quote_threshold (e.g. 42_000 * 10^decimals or tuned number), creation_fee_bps or flat in quote, platform_fee_share_bps, treasury, etc.
- BondingCurve: mint (the new token), virtual_quote_reserves, virtual_token_reserves (or real token account balance), real_quote_account (ATA of curve for the rel coin), creator, complete/graduated flag, etc.
- Similar to pump.fun but quote side is our SPL instead of SOL.

### 4.3 Fee & Revenue Flows (the money)
- Creation: Small fee in rel coin (or sponsored for good agents).
- Trading on curve: Creator fee % (in rel coin) → routed via sharing config to agent + platform/treasury.
- Post-grad: Continue creator fees from the DEX side if the program/AMM supports (or platform takes a different cut).
- Platform take: Used for operations, buybacks, incentives, or burned/locked to benefit rel coin.
- Agent take: High % (target 70%+ like current ClawPump or Virtuals creator share) paid in rel coin (or auto-converted if desired, but holding the rel coin is better for flywheel).

### 4.4 Agent Experience (the magic)
Agent (or KaiNova):
1. Reads the updated ClawPump skill.
2. Acquires rel coin (swap, earnings from prior launches, bridged from Base holdings, etc.).
3. Calls launch API with agentId + metadata.
4. Token appears on the rel-coin bonding curve.
5. Community/others buy with rel coin.
6. Agent earns rel coin passively from fees.
7. On graduation: new token has real liquidity vs rel coin.
8. Agent can use earnings to launch again or pay for compute/other agents.

This is the "agents launching tokens that require our coin, earning our coin" loop.

---

## 5. Requirements

### Functional (MVP scope)
- Agents can launch a new token via API/skill using the rel coin as quote.
- Curve pricing, buy/sell work correctly with the rel coin.
- Clear progress toward graduation threshold (visible in UI and on-chain).
- Automatic or crank-triggered graduation to a real DEX pool paired vs rel coin + LP lock mechanism.
- Fee capture during curve phase in rel coin, with sharing to the agentId (and platform).
- Earnings queryable by agentId (in rel coin units + USD equivalent).
- Metadata + image support (reuse existing ClawPump upload).
- No pre-mine / fair launch (100% of supply on curve or graduated pool).

### Non-Functional
- Gasless or very low friction for agents (sponsored or relayer pattern).
- Front-running protection (Jito bundles or equivalent for the new program).
- High reliability for the gateway API.
- Transparent on-chain (anyone can verify curve state, reserves, LP lock).
- Security: Full audit of the bonding curve program before mainnet launches. Bug bounty recommended.
- Scalability: Handle pump.fun-like volume spikes.

### Agent & Ecosystem Specific
- First-class skill.md and prompt examples for agents (Claude, Grok, Cursor, etc.).
- Compatible with Virtuals ACP agents (KaiNova) and OpenClaw-style agents.
- Earnings should be usable (at minimum withdrawable; ideally composable in agent economy).
- Support for "tokenized agent" style buyback or revenue share mechanics (reuse patterns from existing skills).

### Gradation & Trust
- Strong LP lock / non-extractable liquidity signal (10yr equivalent or better on Solana).
- Clear "graduated" badge and links to the DEX pool.
- Optional anti-sniper / decaying tax module (like Virtuals) configurable per launch or global.

---

## 6. Implementation Phases (Reuse-Heavy)

**Phase 0 — Research & Alignment (this doc)**
- Done. Owner reviews, decides on token (which exact mint is the "rel coin"?), budget, team, audit partners, timeline.

**Phase 1 — MVP Custom Curve + Gateway (Core Loop)**
- Deploy simple custom bonding curve program (fixed quote_mint = rel coin, basic buy/sell, graduation condition).
- Extend ClawPump backend to support rel-coin launches (parallel path or new mode).
- Update agent skill.md + test prompts.
- Basic dashboard/leaderboard for the new curve.
- Internal testing + closed agent launches.
- Fee distribution to agents (simple sharing or direct).
- **Reuse:** Existing upload flow, metadata patterns, pump-fun-skills as reference for tx building/fee logic, pump-agent-launcher patterns.

**Phase 2 — Graduation, Liquidity, Polish**
- Full graduation flow + Raydium (or chosen DEX) pool creation + LP locking.
- Earnings dashboard with rel coin balances + history.
- Public launch of the rel-coin curve alongside (or replacing) the SOL one for ClawPump.
- Anti-sniper / module features if desired.
- More agent onboarding (KaiNova integration testing).

**Phase 3 — Ecosystem & Flywheel**
- Deeper ACP / agent payments integration so earnings in rel coin are directly useful.
- Incentives (launch bounties in rel coin, volume rewards, etc.).
- Analytics, social amplification, Moltbook-style or equivalent.
- Potential multi-curve (still support SOL launches for volume while pushing rel-coin premium launches).
- Further products (agent trading, lending against holdings, etc.).

**Phase 4 — Hardening**
- Multiple audits.
- Bug bounty.
- On-chain governance for params (optional).
- Cross-chain considerations (Base ↔ Solana bridging for KNTWS holders who want to participate).

---

## 7. Risks & Mitigations

- **Smart contract risk (biggest):** New bonding curve program. Mitigation: Reuse battle-tested math from pump.fun or audited open source curves; professional audit (Trail of Bits / OtterSec / etc.); bug bounty; gradual rollout (small caps first).
- **Bootstrapping the rel coin:** If no one has the rel coin, no one can launch or buy. Mitigation: Initial distribution/airdrop to agents/creators, liquidity provision, bridge from Base holdings, platform buy/sell incentives, or a genesis bonding curve for the rel coin itself.
- **Adoption vs free SOL launches:** pump.fun is free and huge. Why switch? Mitigation: Superior agent UX (gasless + revenue share already works), narrative ("the agent coin that powers agent launches"), potential better fee share or features, exclusive agent leaderboards, integration with Virtuals ACP prestige.
- **Liquidity fragmentation:** Two curves (SOL + rel) could split attention. Mitigation: Make rel-coin curve the "premium / agent-native" one; or migrate ClawPump focus over time; or support both with clear positioning.
- **Regulatory / perception:** Any launchpad carries risk. Mitigation: Strong disclaimers, no guarantees, focus on agent tooling rather than "guaranteed pumps".
- **Operational:** Running cranks, sponsoring gas, image hosting, RPC reliability. Mitigation: Use existing ClawPump ops experience + scale the team.
- **Token value accrual lag:** Fees in rel coin only help if the token has demand/utility. The architecture itself is designed to create that demand (launches require it).

---

## 8. Open Questions / Decisions for Owner

1. **Exact rel coin mint:** Is it the existing $CLAWPUMP on Solana? A new dedicated SPL? Bridged version of KNTWS or another Base token? Decision drives the quote_mint address and all economics.
2. **Graduation threshold:** Mirror 42,000 units (scaled to decimals) or different number? What feels right for the rel coin supply/price?
3. **Fee splits:** Target agent share (70%? 80% like current ClawPump)? Platform/treasury share? Any buyback/burn?
4. **LP lock policy:** 10-year equivalent? Protocol-owned liquidity? Burn + some retained for incentives?
5. **Creation cost:** Free for agents (like current ClawPump) or small rel coin fee/lock (like Virtuals)?
6. **Scope priority:** Start with pure agent launches only, or open to humans too from day 1?
7. **Multi-curve strategy:** Keep SOL launches running in parallel for volume, or focus entirely on rel-coin curve?
8. **Budget & team:** Audit cost, dev cost for program + gateway extensions, ongoing ops (gas sponsorship, infra).
9. **Timeline & milestones:** When do we want a testable MVP on devnet? Closed alpha? Public?
10. **Branding & narrative:** What do we call this? How do we position vs pump.fun and vs Virtuals?
11. **Legal entity / compliance:** Who operates the gateway/platform? Any KYC for large creators?

---

## 9. Key Decisions Summary (to be updated after owner input)

- (Placeholder — will be filled post-review)

---

## 10. Appendix: Sources & Local Assets

See `00_INFO_BRAIN.md` for the full living research brain with links, excerpts, program IDs, local paths, and raw data.

**Critical local paths (this workspace):**
- `/root/pump-fun-skills/` — create-coin, coin-fees (sharing), tokenized-agents, swap.
- `/root/pump-agent-launcher/` + research/ (ClawPump + pump pages).
- `/root/clawpump-research/`, claw* ecosystem dirs.
- User's prior Virtuals ACP context (KaiNova, wallet, KNTWS, 15 offerings).

**External references (as of research date):**
- clawpump.net, clawpump.tech
- whitepaper.virtuals.io (launch mechanics, ACP)
- Virtual-Protocol GitHub
- pump-fun public docs (quote_mint evolution)
- pump-fun-skills source code (exact mechanics we can adapt)

---

## 11. PR / Implementation Roadmap (High-Level, Post-Decision)

Once owner approves and provides answers to open questions:

1. Token & params finalization + initial rel coin liquidity plan.
2. Bonding curve program spec → implementation → internal test → audit.
3. Gateway API extension + new agent skill.md.
4. Dashboard / earnings / leaderboard updates.
5. Graduation + DEX pool integration + LP lock.
6. Closed alpha with selected agents (including KaiNova tests).
7. Public launch + marketing narrative.
8. Ongoing iteration (incentives, more DEXes, deeper ACP composability).

Each phase can be broken into concrete, reviewable work items.

---

**This is the deliverable.** 

Give the owner the two files in this directory (`00_INFO_BRAIN.md` and this PRD). They contain the full current brain + the complete idea, architecture, and decision points.

Ready for the next conversation: "we start something bigggggg" once they review and give the green light + answers to the open questions.

No code was written. Brain is saved. Full potential mode engaged.
