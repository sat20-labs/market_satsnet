'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { marketApi, clientApi } from '@/api';
import { Suspense } from 'react';
import { ChartModule } from '@/components/satoshinet/ChartModule';
import { AssetInfo } from '@/components/satoshinet/AssetInfo';
import { ActivityLog } from '@/components/satoshinet/ActivityLog';
import OrderBookHeader from '@/components/satoshinet/orderbook/OrderBookHearder';
import TakeOrder, { TakeOrderRef } from '@/components/satoshinet/orderbook/TakeOrder';
import MakeOrder from '@/components/satoshinet/orderbook/MakeOrder';
import { useWalletStore } from '@/store';
import { satsToBitcoin, formatBtcAmount } from '@/utils';
import { useQueryKey } from '@/lib/hooks/useQueryKey';
import { useCommonStore } from '@/store';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import Trade from '@/components/satoshinet/swap/SwapTrade';
import LimitOrder from '@/components/satoshinet/limitorder/LimitOrder';
import DepthPanel from '@/components/satoshinet/limitorder/DepthPanel';
import MyOrdersPanel from '@/components/satoshinet/limitorder/MyOrdersPanel';
import TradeHistoryPanel from '@/components/satoshinet/limitorder/TradeHistoryPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function Loading() {
  return <div className="p-4 bg-black text-white w-full">Loading...</div>;
}

function OrderPageContent() {
  // 所有 hooks 必须在组件顶层调用
  const params = useSearchParams();
  const asset = params.get('asset');
  const takeOrderRef = useRef<TakeOrderRef>(null);
  const [activeTab, setActiveTab] = useState<'limitOrder' | 'swap'>('limitOrder');
  const handleTabChange = (tab: 'limitOrder' | 'swap') => {
    setActiveTab(tab);
  };
  const [settings, setSettings] = useState({ showOngoingTrades: false, maxBidPrice: 0 });
  const handleSettingsChange = (newSettings: { showOngoingTrades: boolean; maxBidPrice: number }) => {
    setSettings(newSettings);
  };
  const { address } = useReactWalletStore();
  const [assetBalance, setAssetBalance] = useState({ availableAmt: 0, lockedAmt: 0 });
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [swapContractUrl, setSwapContractUrl] = useState<string>('');
  const [isContractUrlLoading, setIsContractUrlLoading] = useState(false);

  // Fetch asset summary
  const { data, isLoading, error } = useQuery({
    queryKey: ['assetSummary', asset],
    queryFn: () => marketApi.getAssetsSummary({ assets_name: asset ?? '' }),
    enabled: !!asset,
  });
  const tickerInfoQueryKey = useQueryKey(['tickerInfo', asset]);
  const { data: tickerRes } = useQuery({
    queryKey: tickerInfoQueryKey,
    queryFn: () => clientApi.getTickerInfo(asset ?? ''),
    enabled: !!asset,
  });
  const tickerInfo = useMemo(() => {
    return {
      ...tickerRes?.data,
      displayname: tickerRes?.data?.name.Ticker || tickerRes?.data?.Ticker || tickerRes?.data?.assets_name
    };
  }, [tickerRes]);
  const { chain, network } = useCommonStore();
  // Transform asset summary
  const summary = useMemo(() => {
    const summaryData = data?.data?.summary;
    // Provide default values for all required fields
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
      mintProgress: '100%', // Not available in API
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
    async function fetchSwapContractUrl() {
      setIsContractUrlLoading(true);
      try {
        const result = await window.sat20.getDeployedContractsInServer();
        const { contractURLs = [] } = result;
        const list = contractURLs.filter((c: string) => c.indexOf(`${tickerInfo.displayname}_swap.tc`) > -1);
        setSwapContractUrl(list[0] || '');
      } catch {
        setSwapContractUrl('');
      } finally {
        setIsContractUrlLoading(false);
      }
    }
    if (tickerInfo.displayname) fetchSwapContractUrl();
  }, [tickerInfo.displayname]);

  const handleSellSuccess = () => {
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
    <Tabs defaultValue={activeTab} className="w-full">
      <TabsList className="mb-2">
        <TabsTrigger value="limitOrder" onClick={() => handleTabChange('limitOrder')}>限价单</TabsTrigger>
        <TabsTrigger value="swap" onClick={() => handleTabChange('swap')}>Swap</TabsTrigger>
      </TabsList>
      <TabsContent value="limitOrder">
        <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-6 p-2 sm:p-4 h-full w-ful">
          {/* Chart and Asset Info Container */}
          <div className="sm:col-span-2 flex flex-col gap-4 mb-8 sm:mb-0">
            {/* Tradingview Chart */}
            <div className="flex items-center justify-center min-h-[300px] sm:min-h-[680px] sm:mb-0">
              <ChartModule assets_name={asset || ''} tickerInfo={tickerInfo} />
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
              ) : !swapContractUrl ? (
                <div className="w-full mt-4">
                  <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded">
                    未找到合约，请联系管理员添加
                  </div>
                </div>
              ) : (
                <DepthPanel
                  contractURL={swapContractUrl}
                  assetInfo={summary}
                  tickerInfo={tickerInfo}
                  assetBalance={assetBalance}
                  balanceLoading={balanceLoading}
                  onOrderSuccess={handleSellSuccess}
                />
              )}
            </div>
          </div>
        </div>
        {/* 我的订单和所有订单 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="bg-zinc-900 rounded-2xl p-4">
            <MyOrdersPanel contractURL={swapContractUrl} tickerInfo={tickerInfo} assetInfo={summary} />
          </div>
          <div className="bg-zinc-900 rounded-2xl p-4">
            <TradeHistoryPanel contractURL={swapContractUrl} />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="swap">
        <Trade assetInfo={{
          assetLogo: summary.assetLogo,
          assetName: summary.assetName,
          AssetId: summary.assetId,
          floorPrice: parseFloat(summary.floorPrice),
        }} tickerInfo={tickerInfo} onSellSuccess={handleSellSuccess} />
      </TabsContent>
    </Tabs>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrderPageContent />
    </Suspense>
  );
}