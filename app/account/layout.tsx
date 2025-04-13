'use client';

import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import { useCommonStore } from '@/store';
import { useAssetStore } from '@/store/asset';
import { useEffect } from 'react';

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
 
  return (
    <section>
      <WalletConnectBus className="mx-auto mt-20 block">
        {children}
      </WalletConnectBus>
    </section>
  );
}
