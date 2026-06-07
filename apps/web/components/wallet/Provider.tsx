'use client';

import React, { useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Default to public mainnet. Override at deploy time via NEXT_PUBLIC_SOLANA_RPC
// (keep the *public* URL only — never the keyed Helius URL in NEXT_PUBLIC_*).
const endpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl('mainnet-beta');

// Wallet-adapter is typed against an older React 18 ReactNode that doesn't
// include Promise<ReactNode>. Cast the providers to React.FC<any> so JSX
// accepts them under newer @types/react.
const Conn = ConnectionProvider as unknown as React.FC<{
  endpoint: string;
  children: React.ReactNode;
}>;
const Wal = WalletProvider as unknown as React.FC<{
  wallets: unknown[];
  autoConnect?: boolean;
  children: React.ReactNode;
}>;
const Modal = WalletModalProvider as unknown as React.FC<{
  children: React.ReactNode;
}>;

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );
  return (
    <Conn endpoint={endpoint}>
      <Wal wallets={wallets} autoConnect>
        <Modal>{children}</Modal>
      </Wal>
    </Conn>
  );
}
