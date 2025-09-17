'use client';

import React, { useState } from 'react';
import { OrdxProtocolTab } from './OrdxProtocolTab';
import { useRouter } from 'next/navigation';
import { useAssetStore } from '@/store/asset';
import { AssetsList } from './AssetsList';
import PointsDashboard from './PointsDashboard';

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
      {!!protocol && protocol === 'points' ? (
        // 显示 PointsDashboard 页面内容
        <PointsDashboard />
      ) : (
        !!currentAssets?.length && (
          <AssetsList
            assets={currentAssets}
          />
        )
      )}
    </div>
  );
};
