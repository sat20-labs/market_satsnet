'use client';

import React, { useState } from 'react';
import { OrdxProtocolTab } from './OrdxProtocolTab';
import { useRouter } from 'next/navigation';
import { AssetsList } from './AssetsList';
import { useAssetStore } from '@/store/asset';

export const Assets = () => {
  const [protocol, setProtocol] = useState<string>('');   
  const { assets } = useAssetStore();
  const router = useRouter();
  const onProtocolChange = (t: string) => {
    if (t !== protocol) {
      setProtocol(t);
    }
  };

  const currentAssets = assets[protocol as keyof typeof assets];
  const onListClick = (key: string) => {
    console.log('List clicked for asset:', key);
    router.push(`/order?asset=${key}`);
  };
  return (
    <div className="py-4">
      <div className="mb-4">
        <OrdxProtocolTab onChange={onProtocolChange} />
      </div>
      {!!protocol && (
        <AssetsList
          onListClick={onListClick}
          assets={currentAssets}
        />
      )}
    </div>
  );
};
