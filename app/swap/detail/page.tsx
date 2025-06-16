'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { marketApi, clientApi } from '@/api';
import { Suspense } from 'react';
import { useQueryKey } from '@/lib/hooks/useQueryKey';
import { useCommonStore } from '@/store';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { useTranslation } from 'react-i18next';
import { useAssetBalance } from '@/application/useAssetBalanceService';
import { useWalletStore } from '@/store';
import Swap from '@/components/satoshinet/swap/Swap';
import SwapMyOrdersPanel from '@/components/satoshinet/swap/SwapMyOrdersPanel';

function Loading() {
  return <div className="p-4 bg-black text-white w-full">Loading...</div>;
}

function OrderPageContent() {
  const params = useSearchParams();
  const asset = params.get('asset');
  const { address } = useReactWalletStore();
  const { t } = useTranslation();
  const { satsnetHeight } = useCommonStore();
  const { getBalance, balance } = useWalletStore();

  // Fetch asset summary
  const { data, isLoading, error } = useQuery({
    queryKey: ['assetSummary', asset],
    queryFn: () => marketApi.getAssetsSummary({ assets_name: asset ?? '' }),
    enabled: !!asset,
  });
  const { data: tickerRes } = useQuery({
    queryKey: ['tickerInfo', asset],
    queryFn: () => clientApi.getTickerInfo(asset ?? ''),
    enabled: !!asset,
  });
  const tickerInfo = useMemo(() => {
    return {
      ...tickerRes?.data,
      displayname: tickerRes?.data?.name?.Ticker || tickerRes?.data?.Ticker || tickerRes?.data?.assets_name
    };
  }, [tickerRes]);
  const summary = useMemo(() => {
    const summaryData = data?.data?.summary;
    return {
      assetId: summaryData?.assets_name?.Ticker ?? '',
      assetName: summaryData ? `${summaryData.assets_name?.Protocol ?? ''}:${summaryData.assets_name?.Type ?? ''}:${summaryData.assets_name?.Ticker ?? ''}` : '',
      assetLogo: summaryData?.logo ?? '',
      floorPrice: summaryData?.lowest_price?.toString() ?? '0',
    };
  }, [data]);

  // 获取AMM合约URL
  const getAmmContractUrl = async (assetName: string) => {
    const result = await window.sat20.getDeployedContractsInServer();
    const { contractURLs = [] } = result;
    const list = contractURLs.filter(c => c.indexOf(`${assetName}_amm.tc`) > -1);
    return list[0];
  };
  const {
    data: ammContractUrl,
    isLoading: isContractUrlLoading,
  } = useQuery({
    queryKey: ["ammContractUrl", tickerInfo.displayname],
    queryFn: () => getAmmContractUrl(tickerInfo.displayname),
    staleTime: 10 * 1000,
    refetchInterval: 10000,
    enabled: !!tickerInfo.displayname,
  });

  if (!asset) {
    return <div className="p-4 bg-black text-white w-full">Asset parameter missing.</div>;
  }
  if (isLoading || isContractUrlLoading) {
    return <div className="p-4 bg-black text-white w-full">Loading...</div>;
  }
  if (error) {
    return <div className="p-4 bg-black text-white w-full">Error loading data: {error.message}</div>;
  }
  if (!ammContractUrl) {
    return (
      <div className="w-full mt-4">
        <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded">
          未找到合约，请联系管理员添加
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 relative">
      <Swap
        contractUrl={ammContractUrl}
        assetInfo={{
          assetLogo: summary.assetLogo,
          assetName: summary.assetName,
          AssetId: summary.assetId,
          floorPrice: parseFloat(summary.floorPrice),
        }}
        tickerInfo={tickerInfo}
        onSellSuccess={() => {}}
      />
      <div className="mt-8">
        <SwapMyOrdersPanel contractURL={ammContractUrl} />
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrderPageContent />
    </Suspense>
  );
}