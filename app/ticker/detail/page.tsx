'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Loading } from '@/components/Loading';
import { useQuery } from '@tanstack/react-query';
import { clientApi } from '@/api';
import { useCommonStore } from '@/store/common';
import { AssetInfoCard } from '@/components/satoshinet/AssetInfoCard';
import { AssetTransfersPanel } from '@/components/satoshinet/AssetTransfersPanel';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

function TickerDetailContent() {
  const params = useSearchParams();
  const asset = params.get('asset');
  const [total, setTotal] = useState(0);  
  const { network } = useCommonStore();
  const router = useRouter(); // 使用 useRouter 钩子
  
  const { data, isLoading: isTickerLoading } = useQuery<any>({
    queryKey: ['ticker', asset, network],
    queryFn: () => clientApi.getTickerInfo(asset ?? ''),
    enabled: !!asset,
  });
  const tickerInfo = data?.data;

  const mintProgress = '100%';

  if (!asset) {
    return <div className="p-4 bg-black text-white w-full">Asset parameter missing.</div>;
  }
  if (isTickerLoading) {
    return <Loading />;
  }

  return (
    <div className="container mx-auto p-4">
       {/* 返回按钮 */}
       <Button variant="outline"
        className="mb-4 px-6 py-2"
        onClick={() => router.back()} // 返回上一页
      >
        返回
      </Button>
      <h3 className="text-2xl font-bold mb-4 text-center">{tickerInfo.name.Ticker || asset}  <span className='text-zinc-500 ml-4'>Overview</span></h3>      
    
      <AssetInfoCard asset={asset} tickerInfo={tickerInfo} holdersTotal={total}/>
      <AssetTransfersPanel asset={asset} onTotalChange={setTotal} tickerInfo={tickerInfo}/>
    </div>
  );
}

export default function TickerDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <TickerDetailContent />
    </Suspense>
  );
}