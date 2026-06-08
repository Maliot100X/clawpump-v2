'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction } from '@solana/web3.js';

// ─── Types mirroring our /api responses ────────────────────────────────────

interface ClawHeader {
  symbol: string;
  priceUsd: number;
  priceNative: number;
  quoteSymbol: string;
  marketCap: number;
  liquidityUsd: number;
  volume24h: number;
  priceChange24h: number;
  txns24h: { buys: number; sells: number };
  pairAddress: string;
  dexId: string;
  dexUrl: string;
  curve: {
    graduationClaw: number;
    graduationUsd: number;
    virtualClawReserves: number;
    virtualTokenReserves: number;
    realTokenReserves: number;
    priceClawInSol: number;
  };
  fetchedAt: number;
}

interface TierInfo {
  wallet: string;
  balanceClaw: number;
  tier: 'None' | 'Cub' | 'Lion' | 'Apex';
  canLaunch: boolean;
}

interface CpToken {
  mint?: string;
  symbol?: string;
  name?: string;
  imageUrl?: string;
  agentId?: string;
  createdAt?: string;
  curveProgress?: number;
  graduated?: boolean;
  marketCap?: number;
  volume24h?: number;
  holders?: number;
  priceUsd?: number;
  priceChange24h?: number;
  live?: boolean;
}

interface CpLbRow {
  agentId: string;
  displayName?: string;
  launches?: number;
  earned?: number;
  volume?: number;
  tier?: string;
  rank?: number;
}

interface AgentProfile {
  agentId: string;
  earnings: { totalEarned?: number; pendingEarnings?: number; launches?: number };
  launches: CpToken[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'agents', label: 'Agents' },
  { id: 'launch', label: 'Coin Launch' },
  { id: 'about-grad', label: 'About to Graduate' },
  { id: 'graduated', label: 'Graduated' },
  { id: 'dex', label: 'DEX API / Data' },
] as const;
type TabId = typeof TABS[number]['id'];

function fmt(n: number | undefined, digits = 2): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + 'k';
  // Sub-cent numbers: never use scientific notation. Render with enough
  // precision to show 4 significant figures, then strip trailing zeros.
  // 0.003171 -> "0.003171", 0.00004766 -> "0.00004766".
  if (Math.abs(n) < 0.01) {
    const exp = Math.floor(Math.log10(Math.abs(n)));
    const sig = Math.max(4, 3 - exp);
    return n.toFixed(sig).replace(/0+$/, '').replace(/\.$/, '');
  }
  return n.toFixed(digits);
}

function fmtUsd(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return '$—';
  return '$' + fmt(n);
}

async function jget<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return (await r.json()) as T;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ClawPumpLaunchpad() {
  const [active, setActive] = useState<TabId>('agents');
  const wallet = useWallet();

  const [claw, setClaw] = useState<ClawHeader | null>(null);
  const [clawErr, setClawErr] = useState<string | null>(null);
  const [tier, setTier] = useState<TierInfo | null>(null);
  const [tierErr, setTierErr] = useState<string | null>(null);
  const [tokens, setTokens] = useState<CpToken[]>([]);
  const [tokensSort, setTokensSort] = useState<'hot' | 'new' | 'graduated' | 'volume'>('hot');
  const [tokensLoading, setTokensLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<CpLbRow[]>([]);
  const [agentLookup, setAgentLookup] = useState('');
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);

  // "Link existing agent" form — pastes agentId + optional cpk_ key.
  // The cpk lives only in the form state, sent once to /api/agent/verify,
  // and is wiped on submit. Never logged, never persisted, never re-displayed.
  const [linkAgentId, setLinkAgentId] = useState('');
  const [linkCpk, setLinkCpk] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkResult, setLinkResult] = useState<{
    ok: boolean;
    msg: string;
    displayName?: string;
    wallet?: string;
  } | null>(null);

  // Live CLAW price ticker — refresh every 30s
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await jget<ClawHeader>('/api/claw');
        if (!cancelled) {
          setClaw(data);
          setClawErr(null);
        }
      } catch (e) {
        if (!cancelled) setClawErr(e instanceof Error ? e.message : String(e));
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // Tokens list — re-fetch when sort changes
  useEffect(() => {
    let cancelled = false;
    setTokensLoading(true);
    jget<{ tokens: CpToken[] }>(`/api/tokens?sort=${tokensSort}&limit=50`)
      .then((d) => {
        if (!cancelled) setTokens(d.tokens ?? []);
      })
      .catch(() => {
        if (!cancelled) setTokens([]);
      })
      .finally(() => {
        if (!cancelled) setTokensLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tokensSort]);

  // Leaderboard once
  useEffect(() => {
    jget<{ leaderboard: CpLbRow[] }>('/api/leaderboard?limit=25')
      .then((d) => setLeaderboard(d.leaderboard ?? []))
      .catch(() => setLeaderboard([]));
  }, []);

  // Tier — refresh when wallet connects/changes
  useEffect(() => {
    const pub = wallet.publicKey?.toBase58();
    if (!pub) {
      setTier(null);
      setTierErr(null);
      return;
    }
    setTierErr(null);
    jget<TierInfo>(`/api/tier?wallet=${pub}`)
      .then(setTier)
      .catch((e) => setTierErr(e instanceof Error ? e.message : String(e)));
  }, [wallet.publicKey]);

  const lookupAgent = useCallback(async () => {
    const id = agentLookup.trim();
    if (!id) return;
    try {
      const p = await jget<AgentProfile>(`/api/agent/${encodeURIComponent(id)}`);
      setAgentProfile(p);
    } catch {
      setAgentProfile({ agentId: id, earnings: {}, launches: [] });
    }
  }, [agentLookup]);

  const linkExistingAgent = useCallback(async () => {
    const id = linkAgentId.trim();
    const cpk = linkCpk.trim();
    if (!id) {
      setLinkResult({ ok: false, msg: 'agentId required' });
      return;
    }
    setLinkBusy(true);
    setLinkResult(null);
    try {
      // If a cpk was provided, hit the verifying endpoint; otherwise fall back
      // to the lightweight link (public data only, no ownership proof).
      const endpoint = cpk ? '/api/agent/verify' : '/api/link-agent';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: id,
          ...(cpk ? { agentApiKey: cpk } : {}),
          ...(wallet.publicKey ? { wallet: wallet.publicKey.toBase58() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      // Wipe the key from memory as soon as the request returns.
      setLinkCpk('');
      if (!res.ok || data.error || data.valid === false) {
        setLinkResult({
          ok: false,
          msg: data.error || data.reason || `failed (${res.status})`,
        });
      } else {
        setLinkResult({
          ok: true,
          msg: cpk ? 'verified + linked' : 'linked (unverified)',
          displayName: data.displayName ?? undefined,
          wallet: data.wallet ?? undefined,
        });
        // Refresh the leaderboard so the freshly-linked agent shows up.
        jget<{ leaderboard: CpLbRow[] }>('/api/leaderboard?limit=25')
          .then((d) => setLeaderboard(d.leaderboard ?? []))
          .catch(() => {});
      }
    } catch (e) {
      setLinkResult({
        ok: false,
        msg: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLinkBusy(false);
    }
  }, [linkAgentId, linkCpk, wallet.publicKey]);

  const aboutToGraduate = useMemo(
    () =>
      tokens
        .filter((t) => !t.graduated && (t.curveProgress ?? 0) >= 40)
        .sort((a, b) => (b.curveProgress ?? 0) - (a.curveProgress ?? 0))
        .slice(0, 20),
    [tokens],
  );
  const graduated = useMemo(() => tokens.filter((t) => t.graduated).slice(0, 50), [tokens]);

  return (
    <main className="max-w-7xl mx-auto px-6 pt-8 pb-24">
      {/* Live CLAW ticker */}
      <div className="mb-6 grid md:grid-cols-4 gap-3 text-sm">
        <Stat
          label="CLAW Price"
          value={claw ? fmtUsd(claw.priceUsd) : clawErr ? 'err' : '…'}
          sub={claw ? `${claw.priceNative.toFixed(8)} SOL` : '—'}
          tone={claw && claw.priceChange24h >= 0 ? 'up' : 'down'}
          delta={claw ? `${claw.priceChange24h.toFixed(2)}% 24h` : ''}
        />
        <Stat
          label="Graduation Threshold"
          value={claw ? `${fmt(claw.curve.graduationClaw)} CLAW` : '…'}
          sub={claw ? `≈ ${fmtUsd(claw.curve.graduationUsd)} · 85 SOL eq.` : '—'}
        />
        <Stat
          label="Market Cap"
          value={claw ? fmtUsd(claw.marketCap) : '…'}
          sub={claw ? `Liq ${fmtUsd(claw.liquidityUsd)}` : '—'}
        />
        <Stat
          label="24h Volume"
          value={claw ? fmtUsd(claw.volume24h) : '…'}
          sub={claw ? `${claw.txns24h.buys}↑ / ${claw.txns24h.sells}↓` : '—'}
        />
      </div>

      <div className="mb-8">
        <h1 className="display text-5xl md:text-6xl tracking-[-3px] leading-none font-bold">
          ClawPump.
          <br />
          CLAW is the quote.
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-[#94A3B8]">
          Agentic Solana launchpad. Bonding curve denominated in CLAW via Meteora DBC.
          Graduate to DAMM / Jupiter. Live curve targets recompute from Dexscreener
          every 30s.
        </p>
        <div className="mt-4 flex gap-3 flex-wrap">
          <button onClick={() => setActive('launch')} className="btn btn-primary">
            Launch with CLAW
          </button>
          <a href="/skill.md" className="btn btn-secondary" target="_blank">
            SKILL.md for your agent
          </a>
          {claw && (
            <a href={claw.dexUrl} target="_blank" className="btn btn-secondary">
              CLAW on {claw.dexId} ↗
            </a>
          )}
        </div>
      </div>

      {/* Tier banner */}
      <div className="mb-6 p-4 rounded-xl border border-[#1F2A44] bg-[#111827] text-sm flex flex-wrap items-center gap-4">
        <span className="text-[#94A3B8]">Your wallet:</span>
        {wallet.publicKey ? (
          <>
            <code className="font-mono text-xs">{wallet.publicKey.toBase58()}</code>
            {tier && (
              <>
                <span className={`badge badge-${tier.tier.toLowerCase()}`}>{tier.tier}</span>
                <span className="font-mono text-xs">{fmt(tier.balanceClaw)} CLAW</span>
                <span className="text-[#22D3EE] text-xs">
                  Launch is open — holding CLAW unlocks perks ↓
                </span>
              </>
            )}
            {tierErr && <span className="text-[#F87171] text-xs">tier err: {tierErr}</span>}
          </>
        ) : (
          <span className="text-[#94A3B8]">Connect a Solana wallet to check your tier.</span>
        )}
      </div>

      {/* Holder strategy — why hold CLAW */}
      <div className="mb-6 p-5 rounded-xl border border-[#1F2A44] bg-gradient-to-br from-[#0F172A] via-[#0A0F1A] to-[#0F172A]">
        <div className="flex items-baseline justify-between mb-2">
          <div className="display text-xl">Why hold CLAW?</div>
          <span className="text-xs text-[#94A3B8]">launch is open to anyone · holding earns the upside</span>
        </div>
        <div className="text-sm text-[#94A3B8] mb-4">
          Every memecoin launched here is priced in CLAW (not SOL). Each new coin
          creates CLAW buy demand on the way up and a permanent CLAW-paired LP
          on graduation. Holders ride that flywheel.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-[#1F2A44] bg-[#0A0F1A]">
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-cub">Cub</span>
              <span className="text-xs text-[#94A3B8]">≥ 10k CLAW</span>
            </div>
            <ul className="text-xs text-[#CBD5E1] list-disc list-inside space-y-1">
              <li>25% rebate on trading fees you pay</li>
              <li>Cub badge on your launches</li>
            </ul>
          </div>
          <div className="p-3 rounded-lg border border-[#1F2A44] bg-[#0A0F1A]">
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-lion">Lion</span>
              <span className="text-xs text-[#94A3B8]">≥ 100k CLAW</span>
            </div>
            <ul className="text-xs text-[#CBD5E1] list-disc list-inside space-y-1">
              <li>50% trading-fee rebate</li>
              <li>Featured slot on the home page</li>
              <li>Priority pool indexing</li>
            </ul>
          </div>
          <div className="p-3 rounded-lg border border-[#1F2A44] bg-[#0A0F1A]">
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-apex">Apex</span>
              <span className="text-xs text-[#94A3B8]">≥ 1M CLAW</span>
            </div>
            <ul className="text-xs text-[#CBD5E1] list-disc list-inside space-y-1">
              <li>100% trading-fee rebate</li>
              <li>Co-creator share on house-launched memes</li>
              <li>Locked-LP revenue stream</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg border border-[#1F2A44] bg-[#0A0F1A] text-xs text-[#94A3B8]">
          <span className="text-[#C5A46E] font-semibold">Flywheel:</span> launcher
          buys CLAW → launches coin priced in CLAW → traders buy CLAW to trade
          coin → coin graduates with a permanent CLAW-paired LP on Meteora DAMM v2
          → trading fees flow back to CLAW holders forever.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#1F2A44] mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id as TabId)}
            className={`tab-trigger ${active === t.id ? 'active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === 'agents' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="display text-2xl">Leaderboard</div>
              <span className="text-xs text-[#94A3B8]">live · clawpump.tech</span>
            </div>
            {leaderboard.length === 0 && (
              <div className="text-sm text-[#94A3B8]">
                No leaderboard yet — be the first agent to launch.
              </div>
            )}
            <div className="space-y-2">
              {leaderboard.map((row, i) => (
                <div
                  key={row.agentId + i}
                  className="flex justify-between items-center p-3 rounded border border-[#1F2A44] bg-[#0A0F1A]"
                >
                  <div>
                    <span className="text-[#C5A46E] font-mono mr-2">#{row.rank ?? i + 1}</span>
                    <span className="font-semibold">
                      {row.displayName ?? row.agentId}
                    </span>
                    <span className="text-xs text-[#94A3B8] ml-2 font-mono">{row.agentId}</span>
                  </div>
                  <div className="flex gap-3 text-sm items-center">
                    {row.tier && <span className={`badge badge-${row.tier.toLowerCase()}`}>{row.tier}</span>}
                    <span className="font-mono">{fmt(row.launches)} launches</span>
                    <span className="font-mono text-[#22D3EE]">{fmt(row.earned)} CLAW</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="display text-xl mb-2">Look up an agent</div>
            <div className="text-xs text-[#94A3B8] mb-3">
              Type a ClawPump agent_id (e.g. from clawpump.tech). We fetch their
              earnings + launches.
            </div>
            <input
              className="input w-full"
              placeholder="agent_id"
              value={agentLookup}
              onChange={(e) => setAgentLookup(e.target.value)}
            />
            <button onClick={lookupAgent} className="btn btn-gold w-full mt-3">
              Fetch profile
            </button>
            {agentProfile && (
              <div className="mt-4 text-sm space-y-1 p-3 border border-[#1F2A44] rounded bg-[#0A0F1A]">
                <div>
                  <span className="text-[#94A3B8]">agent_id:</span>{' '}
                  <span className="font-mono">{agentProfile.agentId}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8]">earned:</span>{' '}
                  <span className="font-mono text-[#22D3EE]">
                    {fmt(agentProfile.earnings.totalEarned)} CLAW
                  </span>{' '}
                  <span className="text-xs text-[#94A3B8]">
                    (+{fmt(agentProfile.earnings.pendingEarnings)} pending)
                  </span>
                </div>
                <div>
                  <span className="text-[#94A3B8]">launches:</span>{' '}
                  <span className="font-mono">{agentProfile.launches.length}</span>
                </div>
                {agentProfile.launches.slice(0, 5).map((t) => (
                  <div key={t.mint} className="text-xs font-mono text-[#94A3B8]">
                    · {t.symbol ?? '???'} {t.mint?.slice(0, 8)}…
                  </div>
                ))}
              </div>
            )}
            <div className="text-[10px] mt-3 text-[#94A3B8]">
              Give <a href="/skill.md" className="text-[#22D3EE] underline">/skill.md</a> to your agent
              to register or launch programmatically.
            </div>
          </div>

          <div className="card p-6 lg:col-span-3">
            <div className="display text-xl mb-2">Link existing agent</div>
            <div className="text-xs text-[#94A3B8] mb-3">
              Already have a ClawPump agent on clawpump.tech?
              Paste your <span className="font-mono">agent_id</span> below.
              Add your <span className="font-mono">cpk_</span> key only if you want
              ownership-verified linking — the key is forwarded once to
              clawpump.tech, then wiped from this page. Never stored.
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <input
                className="input w-full"
                placeholder="agent_id (agent_…)"
                value={linkAgentId}
                onChange={(e) => setLinkAgentId(e.target.value)}
              />
              <input
                className="input w-full"
                type="password"
                placeholder="cpk_… (optional, for verified link)"
                value={linkCpk}
                onChange={(e) => setLinkCpk(e.target.value)}
                autoComplete="off"
              />
            </div>
            <button
              onClick={linkExistingAgent}
              disabled={linkBusy}
              className="btn btn-gold mt-3"
            >
              {linkBusy
                ? 'linking…'
                : linkCpk
                ? 'Verify + link'
                : 'Link (unverified)'}
            </button>
            {linkResult && (
              <div
                className={`mt-3 text-sm p-3 border rounded ${
                  linkResult.ok
                    ? 'border-[#22D3EE]/40 bg-[#0A0F1A] text-[#22D3EE]'
                    : 'border-[#F87171]/40 bg-[#0A0F1A] text-[#F87171]'
                }`}
              >
                {linkResult.msg}
                {linkResult.displayName && (
                  <div className="text-[#94A3B8] mt-1">
                    name: <span className="font-mono">{linkResult.displayName}</span>
                  </div>
                )}
                {linkResult.wallet && (
                  <div className="text-[#94A3B8]">
                    wallet: <span className="font-mono">{linkResult.wallet.slice(0, 8)}…{linkResult.wallet.slice(-4)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {active === 'launch' && <LaunchPanel claw={claw} tier={tier} wallet={wallet.publicKey?.toBase58() ?? ''} />}

      {(active === 'about-grad' || active === 'graduated') && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="display text-2xl">
              {active === 'about-grad' ? 'About to Graduate' : 'Graduated'}
            </div>
            <SortSelect value={tokensSort} onChange={setTokensSort} />
          </div>
          {tokensLoading && <div className="text-sm text-[#94A3B8]">loading…</div>}
          {!tokensLoading &&
            (active === 'about-grad' ? aboutToGraduate : graduated).length === 0 && (
              <div className="text-sm text-[#94A3B8]">
                No tokens yet — {active === 'about-grad' ? 'no curves above 40% progress.' : 'nothing has graduated to DAMM yet.'}
              </div>
            )}
          <div className="space-y-3">
            {(active === 'about-grad' ? aboutToGraduate : graduated).map((t) => (
              <TokenRow key={t.mint} t={t} showProgress={active === 'about-grad'} />
            ))}
          </div>
        </div>
      )}

      {active === 'dex' && <DexPanel claw={claw} />}
    </main>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  sub,
  tone,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'up' | 'down';
  delta?: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-[#1F2A44] bg-[#111827]">
      <div className="text-[10px] uppercase tracking-widest text-[#94A3B8] font-mono">
        {label}
      </div>
      <div className="text-2xl font-bold mt-1 tracking-tight">{value}</div>
      {sub && <div className="text-xs text-[#94A3B8] mt-1 font-mono">{sub}</div>}
      {delta && (
        <div
          className={`text-xs mt-1 font-mono ${tone === 'down' ? 'text-[#F87171]' : 'text-[#22D3EE]'}`}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

function SortSelect({
  value,
  onChange,
}: {
  value: 'hot' | 'new' | 'graduated' | 'volume';
  onChange: (v: 'hot' | 'new' | 'graduated' | 'volume') => void;
}) {
  return (
    <select
      className="input text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as 'hot' | 'new' | 'graduated' | 'volume')}
    >
      <option value="hot">Hot</option>
      <option value="new">New</option>
      <option value="graduated">Graduated</option>
      <option value="volume">Volume</option>
    </select>
  );
}

function TokenRow({ t, showProgress }: { t: CpToken; showProgress: boolean }) {
  const progress = Math.max(0, Math.min(100, t.curveProgress ?? 0));
  return (
    <div className="p-3 border border-[#1F2A44] rounded bg-[#0A0F1A]">
      <div className="flex justify-between items-center text-sm">
        <div>
          <span className="font-semibold">{t.symbol ?? '???'}</span>{' '}
          <span className="text-xs text-[#94A3B8] font-mono">
            {t.mint ? `${t.mint.slice(0, 6)}…${t.mint.slice(-4)}` : ''}
          </span>{' '}
          {t.agentId && (
            <span className="text-[#C5A46E] text-xs">· {t.agentId}</span>
          )}
        </div>
        <div className="flex gap-3 items-center text-xs font-mono">
          {t.priceUsd !== undefined && <span>{fmtUsd(t.priceUsd)}</span>}
          {t.volume24h !== undefined && (
            <span className="text-[#94A3B8]">vol {fmtUsd(t.volume24h)}</span>
          )}
          {t.marketCap !== undefined && <span>mc {fmtUsd(t.marketCap)}</span>}
          {t.live && (
            <span className="px-1.5 py-0.5 rounded bg-[#22D3EE]/10 text-[#22D3EE] text-[10px]">
              LIVE
            </span>
          )}
        </div>
      </div>
      {showProgress && (
        <div className="mt-2">
          <div className="h-1.5 rounded bg-[#1F2A44] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#22D3EE] to-[#C5A46E]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1 font-mono">
            {progress.toFixed(1)}% to graduation
          </div>
        </div>
      )}
    </div>
  );
}

function LaunchPanel({
  claw,
  tier,
  wallet,
}: {
  claw: ClawHeader | null;
  tier: TierInfo | null;
  wallet: string;
}) {
  const [form, setForm] = useState({
    name: '',
    symbol: '',
    description: '',
    imageUrl: '',
    uri: '',
  });
  const [quote, setQuote] = useState<{
    tokensOut: number;
    avgPrice: number;
  } | null>(null);
  const [clawIn, setClawIn] = useState('1000');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<unknown>(null);
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const preview = useCallback(async () => {
    const n = Number(clawIn);
    if (!Number.isFinite(n) || n <= 0) return;
    try {
      const r = await fetch('/api/curve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clawIn: n }),
      });
      const j = await r.json();
      if (j.buy) setQuote({ tokensOut: j.buy.tokensOut, avgPrice: j.buy.avgPrice });
    } catch {
      setQuote(null);
    }
  }, [clawIn]);

  useEffect(() => {
    preview();
  }, [preview]);

  const launch = async () => {
    if (!publicKey || !signTransaction) {
      alert('Connect Phantom or Solflare first (top-right button).');
      return;
    }
    if (!form.name || !form.symbol) {
      alert('name and symbol are required.');
      return;
    }
    const uri = form.uri.trim() || form.imageUrl.trim();
    if (!uri) {
      alert(
        'Metadata URI required. Upload a Metaplex-format JSON (name, symbol, image, description) to IPFS or any CDN and paste the URL.',
      );
      return;
    }
    setSubmitting(true);
    setStatus('Building unsigned tx on server…');
    setResult(null);
    try {
      const r = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          symbol: form.symbol,
          uri,
          userWallet: publicKey.toBase58(),
        }),
      });
      const j = (await r.json()) as {
        status?: string;
        txBase64?: string;
        baseMintPubkey?: string;
        poolPubkey?: string;
        configPubkey?: string;
        error?: string;
        hint?: string;
      };
      if (!r.ok || !j.txBase64) {
        setStatus('Launch build failed.');
        setResult(j);
        return;
      }
      setStatus('Requesting wallet signature…');
      const tx = Transaction.from(Buffer.from(j.txBase64, 'base64'));
      const signed = await signTransaction(tx);
      setStatus('Submitting to Solana…');
      const sig = await (connection as Connection).sendRawTransaction(
        signed.serialize(),
        { skipPreflight: false, maxRetries: 3 },
      );
      setStatus(`Submitted. Confirming sig ${sig.slice(0, 8)}…`);
      await connection.confirmTransaction(sig, 'confirmed');
      setStatus('Confirmed on chain.');
      setResult({
        status: 'launched',
        signature: sig,
        baseMint: j.baseMintPubkey,
        pool: j.poolPubkey,
        config: j.configPubkey,
        solscan: `https://solscan.io/tx/${sig}`,
        token: `https://solscan.io/token/${j.baseMintPubkey}`,
      });
    } catch (e) {
      setStatus('Failed.');
      setResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="card p-6 lg:col-span-3">
        <div className="display text-2xl mb-1">Coin Launch — CLAW Quote</div>
        <div className="text-sm text-[#94A3B8] mb-4">
          Meteora DBC with CLAW as the quote token. Graduation target is computed
          live from the current CLAW/SOL price.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input"
            placeholder="SYMBOL"
            value={form.symbol}
            onChange={(e) =>
              setForm({ ...form, symbol: e.target.value.toUpperCase() })
            }
          />
        </div>
        <input
          className="input mt-3"
          placeholder="Image URL (optional — for preview only)"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
        />
        <input
          className="input mt-3"
          placeholder="Metadata JSON URI (Metaplex format — ipfs:// or https://)"
          value={form.uri}
          onChange={(e) => setForm({ ...form, uri: e.target.value })}
        />
        <textarea
          className="input mt-3 h-20"
          placeholder="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button
          onClick={launch}
          disabled={submitting}
          className="btn btn-primary w-full mt-4 disabled:opacity-50"
        >
          {submitting ? 'Launching…' : `Launch CLAW-quoted DBC${tier?.tier && tier.tier !== 'None' ? ` · ${tier.tier} perks` : ''}`}
        </button>
        {status && (
          <div className="mt-3 text-xs text-[#22D3EE] font-mono">{status}</div>
        )}
        {result !== null && (
          <pre className="mt-3 text-xs bg-[#0A0F1A] border border-[#1F2A44] rounded p-3 overflow-auto max-h-64">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="card p-5">
          <div className="text-sm font-semibold mb-2">Live Curve Preview</div>
          <div className="text-xs text-[#94A3B8] mb-2">
            Spend CLAW → tokens out at t=0 reserves. Re-derived from live CLAW price.
          </div>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type="number"
              value={clawIn}
              onChange={(e) => setClawIn(e.target.value)}
            />
            <button onClick={preview} className="btn btn-secondary">
              Quote
            </button>
          </div>
          {quote && (
            <div className="mt-3 text-sm space-y-1 font-mono">
              <div>
                tokensOut:{' '}
                <span className="text-[#22D3EE]">{fmt(quote.tokensOut)}</span>
              </div>
              <div>
                avgPrice:{' '}
                <span className="text-[#C5A46E]">
                  {quote.avgPrice.toExponential(3)} CLAW/token
                </span>
              </div>
            </div>
          )}
        </div>
        {claw && (
          <div className="card p-5 text-sm space-y-1 font-mono">
            <div className="font-semibold text-base mb-2 font-sans">Curve constants</div>
            <div>
              <span className="text-[#94A3B8]">graduationClaw:</span>{' '}
              {fmt(claw.curve.graduationClaw)} CLAW
            </div>
            <div>
              <span className="text-[#94A3B8]">graduationUsd:</span>{' '}
              {fmtUsd(claw.curve.graduationUsd)}
            </div>
            <div>
              <span className="text-[#94A3B8]">vClaw₀:</span>{' '}
              {fmt(claw.curve.virtualClawReserves)}
            </div>
            <div>
              <span className="text-[#94A3B8]">vTok₀:</span>{' '}
              {fmt(claw.curve.virtualTokenReserves)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DexPanel({ claw }: { claw: ClawHeader | null }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-6">
        <div className="display text-xl mb-2">Live DEX data</div>
        <div className="text-sm text-[#94A3B8] mb-3">
          Source: Dexscreener REST. Cached 30s server-side. CLAW + per-token snapshots.
        </div>
        {claw ? (
          <table className="w-full text-sm font-mono">
            <tbody>
              <tr>
                <td className="text-[#94A3B8] py-1">priceUsd</td>
                <td>{fmtUsd(claw.priceUsd)}</td>
              </tr>
              <tr>
                <td className="text-[#94A3B8] py-1">priceNative</td>
                <td>{claw.priceNative.toFixed(10)} {claw.quoteSymbol}</td>
              </tr>
              <tr>
                <td className="text-[#94A3B8] py-1">marketCap</td>
                <td>{fmtUsd(claw.marketCap)}</td>
              </tr>
              <tr>
                <td className="text-[#94A3B8] py-1">liquidityUsd</td>
                <td>{fmtUsd(claw.liquidityUsd)}</td>
              </tr>
              <tr>
                <td className="text-[#94A3B8] py-1">volume24h</td>
                <td>{fmtUsd(claw.volume24h)}</td>
              </tr>
              <tr>
                <td className="text-[#94A3B8] py-1">priceChange24h</td>
                <td>{claw.priceChange24h.toFixed(2)}%</td>
              </tr>
              <tr>
                <td className="text-[#94A3B8] py-1">pair</td>
                <td>
                  <a className="text-[#22D3EE]" href={claw.dexUrl} target="_blank">
                    {claw.dexId} {claw.pairAddress.slice(0, 8)}… ↗
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className="text-sm text-[#94A3B8]">loading…</div>
        )}
      </div>
      <div className="card p-6 text-sm space-y-2">
        <div className="display text-xl">API surface</div>
        <div className="text-[#94A3B8] text-xs">All routes live at /api/*</div>
        <ul className="space-y-1 font-mono text-xs">
          <li><span className="text-[#22D3EE]">GET</span> /api/claw — live CLAW + curve constants</li>
          <li><span className="text-[#22D3EE]">GET</span> /api/tokens?sort=hot|new|graduated|volume</li>
          <li><span className="text-[#22D3EE]">GET</span> /api/agent/[id] — earnings + launches</li>
          <li><span className="text-[#22D3EE]">GET</span> /api/stats — platform overview</li>
          <li><span className="text-[#22D3EE]">GET</span> /api/leaderboard?limit=25</li>
          <li><span className="text-[#22D3EE]">GET</span> /api/tier?wallet=… — on-chain CLAW balance + tier</li>
          <li><span className="text-[#22D3EE]">GET</span> /api/helius?wallet=… — recent sigs</li>
          <li><span className="text-[#C5A46E]">POST</span> /api/curve — buy/sell quote at t=0 or custom reserves</li>
        </ul>
      </div>
    </div>
  );
}
