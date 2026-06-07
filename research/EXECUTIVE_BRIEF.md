# Executive Brief — ClawPump RelCoin Launch Platform (Virtuals Model on Solana)

**One-pager for the token owner / decision maker.**

## The Opportunity
Virtuals Protocol proved a powerful model on Base: make **your token ($VIRTUAL)** the quote currency for all agent token launches. Everyone who wants to launch or buy early must acquire your token. Curves accumulate your token. At a threshold they graduate to DEX pools paired against your token. This creates structural, recurring demand.

ClawPump has already proven the **agent gateway + gasless launches + high revenue share to agents** works extremely well on Solana (pump.fun volume, Pump.fun investment, 1700+ agents, real earnings flowing to agents).

**The missing piece for a 10x flywheel:** Combine them. Build the equivalent of Virtuals' custom-quote launch curves, but on Solana, powered by ClawPump as the agent front door, denominated in **your rel coin**.

Result: Your rel coin becomes the "base asset" for a whole wave of agent-driven and community token launches. Agents need it to launch. Buyers need it to participate fairly. Fees flow in it. Graduated liquidity is paired against it.

## Simple Feasibility
**YES — it is buildable.**

- Pump.fun's official curve is SOL-first (with limited multi-quote additions). We cannot hijack it for a custom team's token as the universal quote.
- Solution: Deploy our **own bonding curve program** on Solana (standard math, quote_mint = our rel coin). This is common (many forks/clones exist; we have deep local pump.fun skill code as reference).
- Extend the existing ClawPump API + skill layer (we already have excellent local infra: pump-fun-skills, pump-agent-launcher, prior ClawPump research) to make launches "pay with our rel coin", gasless for agents, with revenue share in our token.
- Graduation creates real Raydium/Meteora pools (new token / our rel coin) + strong LP lock.
- We already have a running Virtuals ACP agent (KaiNova) that can be one of the first power users.

We have more of the agent + pump.fun integration pieces in place locally than most teams starting from scratch.

## What Must Be Built (high level)
1. New Solana program: bonding curve with fixed/custom quote = rel coin mint. Buy/sell/graduate instructions. Fee routing (reuse sharing config patterns).
2. Gateway extension: ClawPump-style API that talks to the new curve. Agent skill.md update.
3. Graduation + DEX integration + LP locking (trust signal like Virtuals' 10-year lock).
4. Dashboard, earnings (in rel coin), leaderboards, cranks.
5. Audits (mandatory for the program). Gas sponsorship / relayer ops. Initial rel coin distribution so agents can actually use it.

## What We Already Have (huge head start)
- ClawPump live product + traction + agent distribution model.
- Local high-quality pump.fun agent skills (create, fees with shareholder splits, tokenized agent payments).
- pump-agent-launcher infra.
- Virtuals ACP agent (KaiNova) + wallet + offerings already set up.
- Research brain + this architecture spec.

## Key Decisions Needed From Owner
- Which exact token/mint is the "rel coin" (existing $CLAWPUMP? new one? bridged from Base KNTWS?).
- Graduation threshold, fee splits (agent vs platform), creation cost (free for agents or small rel fee), LP lock policy.
- Parallel SOL curve or focus on rel-coin curve?
- Budget, timeline, audit partners.

## Recommended Next Step
1. Owner reviews the two main files in this folder:
   - `00_INFO_BRAIN.md` (full research, sources, numbers, local assets, "never lose this" knowledge).
   - `01_PRODUCT_ARCHITECTURE_PRD.md` (complete vision, architecture, requirements, phases, risks, open questions).
2. Schedule a call or reply with answers to the open questions + go / no-go + priorities.
3. Only then: move to detailed technical spec → program design → implementation (with the design skill / subagents if desired for rigor).

## Bottom Line
This is not "easy config change". It is a real product (new program + gateway + agent flywheel). But the model works (Virtuals), the agent distribution channel works (ClawPump), and we have unusually strong existing code and agent setup to accelerate it.

When the owner says "let's go", we are already the best-positioned team to execute because the research, local assets, and agent relationships are pre-loaded.

**Files location:** /root/rel-coin-clawpump-research/

Ready when you are.
