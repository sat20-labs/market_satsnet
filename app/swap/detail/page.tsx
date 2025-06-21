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
import { ChartModule } from '@/components/satoshinet/ChartModule';
import { useWalletStore } from '@/store';
import Swap from '@/components/satoshinet/swap/Swap';
import SwapMyOrdersPanel from '@/components/satoshinet/swap/SwapMyOrdersPanel';
import { getDeployedContractInfo, getContractStatus } from '@/api/market';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import WithDraw from '@/components/satoshinet/swap/WithDraw';
import Deposit from '@/components/satoshinet/swap/Deposit';
import { AssetInfo } from '@/components/satoshinet/AssetInfo';

function Loading() {
  return <div className="p-4 bg-black text-white w-full">Loading...</div>;
}

function AssetInfoCard({ assetInfo, contractUrl, tickerInfo, protocol, assetAmt, satValue, currentPrice, t }) {
  return (
    <div className="flex items-center gap-3 mb-4 pb-2">
      <div className="bg-zinc-900 rounded-xl p-4 flex flex-col text-sm w-full border border-zinc-800 shadow-lg">
        <div className="flex items-center mb-2 gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center text-zinc-300 text-xl font-bold">
            {assetInfo.assetName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-zinc-400 font-semibold text-lg">{assetInfo.assetName}</p>
            <p className="text-zinc-500 text-xs gap-2">
              {t('common.contractAddress')}：<span className="text-blue-400 mr-2">{contractUrl.slice(0, 8)}...{contractUrl.slice(-4)}</span>
              {t('common.protocol')}：{protocol}
            </p>
          </div>
        </div>
        <div className="text-sm pt-2 text-zinc-500 border-t border-zinc-800 space-y-2">
          <div className="flex justify-start items-start">
            <span className="text-zinc-500">{t('common.poolAssetInfo')}：</span>
            <div className="text-left text-zinc-500 space-y-1">
              <p><span className="font-bold mr-2">{assetAmt?.toLocaleString()}</span> {tickerInfo?.displayname}</p>
              <p><span className="font-bold mr-2">{satValue?.toLocaleString()}</span> sats</p>
            </div>
          </div>
          <div className="flex justify-start items-center gap-1">
            <span className="text-zinc-500">{t('common.currentPrice')}：</span>
            <span className="text-green-600 font-bold">
              ~ {currentPrice || '--'}
            </span>
            sats
          </div>
        </div>
      </div>
    </div>
  );
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
  console.log('AssetInfo data', data);
  console.log('AssetInfo tickerInfo', tickerInfo);
  
  const summary = useMemo(() => {
    const summaryData = data?.data?.summary;
    return {
      assetId: summaryData?.assets_name?.Ticker ?? '',
      AssetId: summaryData?.assets_name?.Ticker ?? '',
      assetName: summaryData ? `${summaryData.assets_name?.Protocol ?? ''}:${summaryData.assets_name?.Type ?? ''}:${summaryData.assets_name?.Ticker ?? ''}` : '',
      assetType: summaryData?.assets_name?.Type ?? '',
      protocol: summaryData?.assets_name?.Protocol ?? '',
      assetLogo: summaryData?.logo ?? '',
      floorPrice: summaryData?.lowest_price?.toString() ?? '0',
      price: summaryData?.lowest_price ?? 0,
      volume: summaryData?.tx_total_volume?.toString() ?? '0',
      marketCap: summaryData?.market_cap?.toString() ?? '0',
      holders: summaryData?.holder_count ?? 0,
      transactions: summaryData?.tx_order_count ?? 0,
      mintProgress: '100%',
      nickname: summaryData?.nickname || '',
      assetSymbol: summaryData?.assets_name?.Ticker ?? '',
      assetDescription: summaryData?.description ?? '',
    };
  }, [data]);

  // 获取AMM合约URL
  const getAmmContractUrl = async (assetName: string) => {
    const deployed = await getDeployedContractInfo();
    const contractURLs = deployed.url || (deployed.data && deployed.data.url) || [];
    const list = contractURLs.filter((c: string) => c.indexOf(`${assetName}_amm.tc`) > -1);
    return list[0];
  };
  const {
    data: ammContractUrl,
    isLoading: isContractUrlLoading,
  } = useQuery({
    queryKey: ["ammContractUrl", tickerInfo.displayname],
    queryFn: () => getAmmContractUrl(tickerInfo.displayname),
    enabled: !!tickerInfo.displayname,
  });

  // 获取池子状态（价格）
  const { data: swapData } = useQuery({
    queryKey: ["swapData", ammContractUrl],
    queryFn: async () => {
      if (!ammContractUrl) return null;
      const { status } = await getContractStatus(ammContractUrl);
      return status ? JSON.parse(status) : null;
    },
    enabled: !!ammContractUrl,
    refetchIntervalInBackground: false,
  });

  const contractK = useMemo(() => swapData?.Contract?.k || 0, [swapData]);
  const assetAmtRaw = useMemo(() => swapData?.AssetAmtInPool || { Precision: 0, Value: 0 }, [swapData]);
  const assetAmt = useMemo(() => assetAmtRaw.Value / Math.pow(10, assetAmtRaw.Precision), [assetAmtRaw]);
  const satValue = useMemo(() => swapData?.SatsValueInPool || 0, [swapData]);
  const protocol = useMemo(() => swapData?.Contract?.assetName?.Protocol || '', [swapData]);
  const currentPrice = useMemo(() => {
    if (!swapData?.LastDealPrice?.Value || !swapData?.LastDealPrice?.Precision) return 0;
    return Number((swapData.LastDealPrice.Value / Math.pow(10, swapData.LastDealPrice.Precision)).toFixed(10));
  }, [swapData]);



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
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-6 p-2 sm:p-4 h-full w-ful">
        {/* Chart and Asset Info Container */}
        <div className="sm:col-span-1 flex flex-col gap-4 mb-8 sm:mb-0">
          {/* Tradingview Chart */}
          <div className="flex items-center justify-center min-h-[300px] sm:min-h-[680px] sm:mb-0">
            <ChartModule contractURL={ammContractUrl} tickerInfo={tickerInfo} />
          </div>
          <div className="flex items-center justify-center w-full h-[210px] sm:h-[220px] mt-7 sm:mt-1 sm:mb-0">
            <AssetInfo depthData={swapData} tickerInfo={tickerInfo} />
          </div>
        </div>
        <div className="sm:col-span-1 flex items-center justify-center mb-4 mt-3 sm:mb-0 sm:mt-0">
          <div className="max-w-full mx-auto p-4 bg-zinc-900 text-zinc-200 rounded-2xl shadow-lg border border-zinc-700/50 w-full h-full">
            <AssetInfoCard assetInfo={{
              assetLogo: summary.assetLogo,
              assetName: summary.assetName,
              AssetId: summary.assetId,
              floorPrice: parseFloat(summary.floorPrice),
            }} contractUrl={ammContractUrl} tickerInfo={tickerInfo} protocol={protocol} assetAmt={assetAmt} satValue={satValue} currentPrice={currentPrice} t={t} />
            <Tabs defaultValue="swap" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="swap">兑换</TabsTrigger>
                <TabsTrigger value="deposit">充值</TabsTrigger>
                <TabsTrigger value="withdraw">提取</TabsTrigger>
              </TabsList>
              <TabsContent value="swap">
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
                  swapData={swapData}
                  contractK={contractK}
                  assetAmtRaw={assetAmtRaw}
                  assetAmt={assetAmt}
                  satValue={satValue}
                  currentPrice={currentPrice}
                />
              </TabsContent>
              <TabsContent value="deposit">
                <Deposit
                  contractUrl={ammContractUrl}
                  assetInfo={{
                    assetLogo: summary.assetLogo,
                    assetName: summary.assetName,
                    AssetId: summary.assetId,
                    floorPrice: parseFloat(summary.floorPrice),
                  }}
                  tickerInfo={tickerInfo}
                />
              </TabsContent>
              <TabsContent value="withdraw">
                <WithDraw
                  contractUrl={ammContractUrl}
                  assetInfo={{
                    assetLogo: summary.assetLogo,
                    assetName: summary.assetName,
                    AssetId: summary.assetId,
                    floorPrice: parseFloat(summary.floorPrice),
                  }}
                  tickerInfo={tickerInfo}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <div className="bg-zinc-900 rounded-2xl p-4 mt-4">
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