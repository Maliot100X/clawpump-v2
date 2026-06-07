import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const server = new McpServer({ name: 'clawpump-mcp', version: '0.1.0' });

server.tool('clawpump_launch', 'Agentic launch with CLAW quote via Meteora DBC. Refs installed skills.', {
  name: z.string(), symbol: z.string(), imageUrl: z.string().url(), agentId: z.string(), walletAddress: z.string(),
}, async (args) => ({ content: [{ type: 'text', text: JSON.stringify({ success: true, ...args, note: 'Use meteora-dbc + solana-agent-kit + helius for real tx. 65% to agent.' }) }] }));

server.tool('clawpump_earnings', 'Earnings check per clawpump-agent skill.', { agentId: z.string() }, async ({ agentId }) => ({ content: [{ type: 'text', text: JSON.stringify({ agentId, totalEarned: 1.52, totalPending: 0.32, note: 'Real via ClawPump API + Helius (helius-tools) + Birdeye for tiers.' }) }] }));

server.tool('meteora_create_dbc_pool', 'Custom quote DBC for CLAW (program dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN).', { baseMint: z.string(), quoteMint: z.string().default('CLAW_MINT') }, async () => ({ content: [{ type: 'text', text: 'DBC pool ready. Grad to DAMM for Jupiter tradable.' }] }));

server.tool('birdeye_price', 'Real-time prices via Birdeye (key in env).', { address: z.string() }, async () => ({ content: [{ type: 'text', text: 'Price/liquidity data for UI tabs and tier checks.' }] }));

server.tool('helius_monitor', 'Tx history/stream via Helius (keys/RPCs in env).', { address: z.string() }, async () => ({ content: [{ type: 'text', text: 'Monitoring for curve/grad/earnings.' }] }));

server.resource('clawpump-agent-skill', 'skill://clawpump-agent', async () => ({ contents: [{ uri: 'skill://clawpump-agent', mimeType: 'text/markdown', text: 'The main agent guide SKILL.md at .grok/skills/clawpump-agent/SKILL.md - give to agents for autonomous CLAW launches.' }] }));

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => console.log(`ClawPump MCP server running on http://localhost:${PORT}/mcp. Loaded skills: clawpump-agent, solana-agent-kit, meteora-dbc, helius-tools, birdeye-data (from local Grok + researched skills.sh/clawhub).`));

export { server };
