'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function WalletBar() {
  return (
    <div className="flex items-center gap-2">
      <WalletMultiButton
        style={{
          background: 'linear-gradient(135deg,#22D3EE 0%,#C5A46E 100%)',
          color: '#0A0F1A',
          fontFamily: 'inherit',
          fontWeight: 700,
          height: 38,
          borderRadius: 10,
          fontSize: 13,
          padding: '0 14px',
        }}
      />
    </div>
  );
}
