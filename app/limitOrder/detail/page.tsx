'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { marketApi, clientApi } from '@/api';
import { Suspense } from 'react';
import { ChartModule } from '@/components/satoshinet/ChartModule';
import { AssetInfo } from '@/components/satoshinet/AssetInfo';
import DepthPanel from '@/components/satoshinet/limitorder/DepthPanel';
import MyOrdersPanel from '@/components/satoshinet/limitorder/MyOrdersPanel';
import TradeHistoryPanel from '@/components/satoshinet/limitorder/TradeHistoryPanel';
import { useCommonStore } from '@/store';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getDeployedContractInfo } from '@/api/market';

function Loading() {
  return <div className="p-4 bg-black text-white w-full">Loading...</div>;
}

function OrderPageContent() {
  const params = useSearchParams();
  const asset = params.get('asset');
  const { address } = useReactWalletStore();
  const [assetBalance, setAssetBalance] = useState({ availableAmt: 0, lockedAmt: 0 });
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [contractUrl, setContractUrl] = useState<string>('');
  const [isContractUrlLoading, setIsContractUrlLoading] = useState(false);

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
  const { chain, network } = useCommonStore();
  // Transform asset summary
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

  useEffect(() => {
    if (!address || !summary.assetName) return;
    setBalanceLoading(true);
    window.sat20.getAssetAmount_SatsNet(address, summary.assetName)
      .then(res => setAssetBalance({ availableAmt: Number(res.availableAmt), lockedAmt: Number(res.lockedAmt) }))
      .finally(() => setBalanceLoading(false));
  }, [address, summary.assetName]);

  useEffect(() => {
    async function fetchContractUrl() {
      setIsContractUrlLoading(true);
      try {
        const deployed = await getDeployedContractInfo();
        const contractURLs = deployed.url || (deployed.data && deployed.data.url) || [];
        const list = contractURLs.filter((c: string) => c.indexOf(`${tickerInfo.displayname}_swap.tc`) > -1);
        setContractUrl(list[0] || '');
      } catch {
        setContractUrl('');
      } finally {
        setIsContractUrlLoading(false);
      }
    }
    if (tickerInfo.displayname) fetchContractUrl();
  }, [tickerInfo.displayname]);
  console.log('contractUrl', contractUrl);

  const handleOrderSuccess = () => {
    if (!address || !summary.assetName) return;
    setBalanceLoading(true);
    window.sat20.getAssetAmount_SatsNet(address, summary.assetName)
      .then(res => setAssetBalance({ availableAmt: Number(res.availableAmt), lockedAmt: Number(res.lockedAmt) }))
      .finally(() => setBalanceLoading(false));
  };

  if (!asset) {
    return <div className="p-4 bg-black text-white w-full">Asset parameter missing.</div>;
  }
  if (isLoading) {
    return <div className="p-4 bg-black text-white w-full">Loading...</div>;
  }
  if (error) {
    return <div className="p-4 bg-black text-white w-full">Error loading data: {error.message}</div>;
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-6 p-2 sm:p-4 h-full w-ful">
        {/* Chart and Asset Info Container */}
        <div className="sm:col-span-2 flex flex-col gap-4 mb-8 sm:mb-0">
          {/* Tradingview Chart */}
          <div className="flex items-center justify-center min-h-[300px] sm:min-h-[680px] sm:mb-0">
            <ChartModule contractURL={contractUrl} tickerInfo={tickerInfo} />
          </div>
          <div className="flex items-center justify-center w-full h-[210px] sm:h-[220px] mt-7 sm:mt-1 sm:mb-0">
            <AssetInfo assetData={summary} />
          </div>
        </div>
        <div className="sm:col-span-1 flex items-center justify-center mb-4 mt-3 sm:mb-0 sm:mt-0">
          <div className="max-w-full mx-auto p-4 bg-zinc-900 text-zinc-200 rounded-2xl shadow-lg border border-zinc-700/50 w-full h-full">
            {/* DepthPanel 盘口 */}
            {isContractUrlLoading ? (
              <div className="w-full mt-4 text-center text-gray-400">加载中...</div>
            ) : !contractUrl ? (
              <div className="w-full mt-4">
                <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded">
                  未找到合约，请联系管理员添加
                </div>
              </div>
            ) : (
              <DepthPanel
                contractURL={contractUrl}
                assetInfo={summary}
                tickerInfo={tickerInfo}
                assetBalance={assetBalance}
                balanceLoading={balanceLoading}
                onOrderSuccess={handleOrderSuccess}
              />
            )}
          </div>
        </div>
      </div>
      {/* 我的订单和所有订单 */}
      <div className="bg-zinc-900 rounded-2xl p-4 mt-4">
        <Tabs defaultValue="myOrders">
          <TabsList className="mb-2">
            <TabsTrigger value="myOrders">我的订单</TabsTrigger>
            <TabsTrigger value="history">所有订单</TabsTrigger>
          </TabsList>
          <TabsContent value="myOrders">
            <MyOrdersPanel contractURL={contractUrl} tickerInfo={tickerInfo} assetInfo={summary} />
          </TabsContent>
          <TabsContent value="history">
            <TradeHistoryPanel contractURL={contractUrl} />
          </TabsContent>
        </Tabs>
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