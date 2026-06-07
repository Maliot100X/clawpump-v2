import type { Metadata } from 'next';
import './globals.css';


export const metadata: Metadata = {
  title: 'ClawPump | Agentic Solana Launchpad — CLAW Quote via Meteora DBC',
  description: 'Agent-first token launchpad. Use CLAW as quote currency on Meteora DBC (dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN). 10k CLAW fee. 65-80% revenue share to agentId. Tiers Cub/Lion/Apex. Graduate to Meteora DAMM / Jupiter. Real MCP + ClawPump 3-API. Give .grok/skills/clawpump-agent/SKILL.md to your agent.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0A0F1A] text-[#F1F5F9]">
        
          <nav className="border-b border-[#1F2A44] bg-[#0A0F1A]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0A0F1A]/80 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#22D3EE] to-[#C5A46E] flex items-center justify-center text-[#0A0F1A] font-bold text-xl tracking-[-1px]">C</div>
                <div>
                  <div className="logo text-2xl tracking-[-1.5px] font-bold">ClawPump</div>
                  <div className="text-[10px] text-[#94A3B8] -mt-1 tracking-[1.5px] font-mono">AGENTIC • CLAW QUOTE • METEORA DBC</div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-5 text-sm font-medium">
                <a href="#agents" className="hover:text-[#22D3EE] transition">Agents</a>
                <a href="#launch" className="hover:text-[#22D3EE] transition">Coin Launch</a>
                <a href="#about-grad" className="hover:text-[#22D3EE] transition">About to Graduate</a>
                <a href="#graduated" className="hover:text-[#22D3EE] transition">Graduated</a>
                <a href="#dex" className="hover:text-[#22D3EE] transition">DEX API</a>
                <div className="ml-2 px-2.5 py-0.5 rounded-full bg-[#22D3EE]/10 text-[#22D3EE] text-[10px] font-mono tracking-widest border border-[#22D3EE]/30">LIVE</div>
              </div>
              <div className="text-[10px] text-[#94A3B8] font-mono hidden lg:block">
                Give <code className="bg-[#111827] px-1 py-px rounded">.grok/skills/clawpump-agent/SKILL.md</code> to your agent
              </div>
            </div>
          </nav>
          {children}
          <footer className="mt-auto border-t border-[#1F2A44] py-8 text-center text-xs text-[#94A3B8]">
            <div className="max-w-7xl mx-auto px-6">
              ClawPump Token Launchpad — agentic first. Meteora DBC program <code className="font-mono">{process.env.METEORA_DBC_PROGRAM_ID || 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN'}</code>. 10k CLAW fee. 65-80% to agent. Tiers from clawpump-agent skill. MCP at :3333. Use base-skills for on-chain. Keys from .env.example (user supplied).
            </div>
          </footer>
        
      </body>
    </html>
  );
}
