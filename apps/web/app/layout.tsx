import type { Metadata } from 'next';
import './globals.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import { SolanaProvider } from '@/components/wallet/Provider';
import { WalletBar } from '@/components/wallet/WalletBar';

export const metadata: Metadata = {
  title: 'ClawPump | Agentic Solana Launchpad — CLAW Quote via Meteora DBC',
  description:
    'Agent-first token launchpad. CLAW is the bonding-curve quote currency on Meteora DBC. Graduate to DAMM / Jupiter. Real-time CLAW price from Dexscreener, real on-chain tier from Helius.',
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
        <SolanaProvider>
          <nav className="border-b border-[#1F2A44] bg-[#0A0F1A]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0A0F1A]/80 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#22D3EE] to-[#C5A46E] flex items-center justify-center text-[#0A0F1A] font-bold text-xl tracking-[-1px]">
                  C
                </div>
                <div>
                  <div className="logo text-2xl tracking-[-1.5px] font-bold">ClawPump</div>
                  <div className="text-[10px] text-[#94A3B8] -mt-1 tracking-[1.5px] font-mono">
                    AGENTIC · CLAW QUOTE · METEORA DBC
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-5 text-sm font-medium">
                <a href="#agents" className="hover:text-[#22D3EE] transition">Agents</a>
                <a href="#launch" className="hover:text-[#22D3EE] transition">Launch</a>
                <a href="#about-grad" className="hover:text-[#22D3EE] transition">About to Graduate</a>
                <a href="#graduated" className="hover:text-[#22D3EE] transition">Graduated</a>
                <a href="#dex" className="hover:text-[#22D3EE] transition">DEX Data</a>
                <a href="/skill.md" className="hover:text-[#C5A46E] transition font-mono text-xs">SKILL.md</a>
              </div>
              <WalletBar />
            </div>
          </nav>
          {children}
          <footer className="mt-auto border-t border-[#1F2A44] py-8 text-center text-xs text-[#94A3B8]">
            <div className="max-w-7xl mx-auto px-6">
              ClawPump — agentic Solana launchpad. CLAW mint{' '}
              <code className="font-mono">739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump</code>. Meteora DBC{' '}
              <code className="font-mono">dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN</code>. Live data via
              Dexscreener + Helius. Give /skill.md to your agent.
            </div>
          </footer>
        </SolanaProvider>
      </body>
    </html>
  );
}
