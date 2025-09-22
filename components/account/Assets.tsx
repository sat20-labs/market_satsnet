'use client';

import React, { useState } from 'react';
import { OrdxProtocolTab } from './OrdxProtocolTab';
import { useRouter } from 'next/navigation';
import { useAssetStore } from '@/store/asset';
import { AssetsList } from './AssetsList';
import PointsDashboard from './../points/PointsDashboard';

export const Assets = () => {
  const [protocol, setProtocol] = useState<string>('ordx');
  const { assets } = useAssetStore();
  // console.log('assets', assets);
  // console.log('assets', protocol);
  const onProtocolChange = (t: string) => {
    // console.log('onProtocolChange', t);

    if (t !== protocol) {
      setProtocol(t);
    }
  };

  const currentAssets = assets[protocol as keyof typeof assets];
  return (
    <div className="py-4">
      <div className="mb-4">
        <OrdxProtocolTab onChange={onProtocolChange} />
      </div>
      {!!currentAssets?.length && (
        <AssetsList
          assets={currentAssets}
        />
      )}
    </div>
  );
};
