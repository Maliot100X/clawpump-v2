# AGENTS.md — ClawPump Token Launchpad

For all code changes and implementation in this repo:

- Always point to and follow: `.grok/skills/clawpump-agent/SKILL.md` (the primary agent skill guide)
- Use `/implement` (with Grok skills: clawpump-agent + mcp-server-dev + frontend-design + base pump-fun-skills + implement rules) for any modifications.
- Follow existing code patterns exactly (see base-skills/* for JS/TS structure, mcp remote-http-scaffold, bold non-generic frontend per design skill).
- Smallest change that solves the problem. One-by-one, no errors. Run fmt/lint/build before done.
- See root README.md for full context, tiers, 3-API, CLAW/Meteora numbers, "one-by-one perfect functional".
- Research sources: research/00_INFO_BRAIN.md + 01_PRODUCT_ARCHITECTURE_PRD.md + EXECUTIVE_BRIEF.md

Do not introduce old names (no KNTWS etc). All new code uses ClawPump / CLAW / exact specs.
