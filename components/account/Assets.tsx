'use client';

import React, { useState } from 'react';
import { OrdxProtocolTab } from './OrdxProtocolTab';
import { useRouter } from 'next/navigation';
import { AssetsList } from './AssetsList';
import { useAssetStore } from '@/store/asset';
import { NewAssetsList } from './NewAssetsList';

export const Assets = () => {
  const [protocol, setProtocol] = useState<string>('ordx');   
  const { assets } = useAssetStore();
  const router = useRouter();
  const onProtocolChange = (t: string) => {
    console.log('t', t);
    
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
      {!!protocol && currentAssets?.length&& (
        <AssetsList
          onListClick={onListClick}
          assets={currentAssets}
        />
        // <NewAssetsList
        //   assets={currentAssets}
        //   // onListClick={onListClick}
        // />
      )}
    </div>
  );
};
