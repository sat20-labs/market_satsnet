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

function Loading() {
  return <div className="p-4 bg-black text-white w-full">Loading...</div>;
}

function OrderPageContent() {
  const params = useSearchParams();
  const asset = params.get('asset');
  const takeOrderRef = useRef<TakeOrderRef>(null);
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
    return tickerRes?.data || {};
  }, [tickerRes]);
  const { chain, network } = useCommonStore();
  // Transform asset summary
  const summary = useMemo(() => {
    const summaryData = data?.data?.summary;
    // Provide default values for all required fields
    return {
      assetId: summaryData?.assets_name?.Ticker ?? '',
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

  // Wallet and order book state
  const [activeTab, setActiveTab] = useState<'takeOrder' | 'makeOrder'>('takeOrder');
  const handleTabChange = (tab: 'takeOrder' | 'makeOrder') => {
    setActiveTab(tab);
  };
  const [settings, setSettings] = useState({ showOngoingTrades: false, maxBidPrice: 0 });
  const handleSettingsChange = (newSettings: { showOngoingTrades: boolean; maxBidPrice: number }) => {
    setSettings(newSettings);
  };
  console.log(tickerInfo);

  const { address } = useReactWalletStore();
  const [assetBalance, setAssetBalance] = useState({ availableAmt: 0, lockedAmt: 0 });
  const [balanceLoading, setBalanceLoading] = useState(false);
  useEffect(() => {
    if (!address || !summary.assetName) return;
    setBalanceLoading(true);
    window.sat20.getAssetAmount_SatsNet(address, summary.assetName)
      .then(res => setAssetBalance({ availableAmt: Number(res.availableAmt), lockedAmt: Number(res.lockedAmt) }))
      .finally(() => setBalanceLoading(false));
  }, [address, summary.assetName]);
  console.log("assetBalance", assetBalance);
  
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
  const handleRefresh = async () => {
    console.log("handleRefresh");
    if (activeTab === "takeOrder" && takeOrderRef.current) {


      await takeOrderRef.current.forceRefresh();
    }
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-6 sm:p-4 h-full w-ful">
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
        <div className="max-w-full mx-auto p-4 bg-[#0E0E10] text-zinc-200 rounded-2xl shadow-lg border border-zinc-700 w-full h-full">
          <OrderBookHeader
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onRefresh={handleRefresh}
            onSettingsChange={handleSettingsChange}
          />
          {activeTab === 'takeOrder' ? (
            <TakeOrder
              ref={takeOrderRef}
              assetInfo={{
                assetLogo: summary.assetLogo,
                assetName: summary.assetName,
                AssetId: summary.assetId,
                floorPrice: parseFloat(summary.floorPrice),
              }}
              tickerInfo={tickerInfo}
              assetBalance={assetBalance.availableAmt}
              onSellSuccess={handleSellSuccess}
            />
          ) : (
            <MakeOrder assetInfo={{
              assetLogo: summary.assetLogo,
              assetName: summary.assetName,
              AssetId: summary.assetId,
              floorPrice: parseFloat(summary.floorPrice),
            }} tickerInfo={tickerInfo} assetBalance={assetBalance} balanceLoading={balanceLoading} onSellSuccess={handleSellSuccess} />
          )}
          <div className="mt-4 text-sm text-gray-400">
            {settings.showOngoingTrades && <p>Show pending transactions...</p>}
            {settings.maxBidPrice > 0 && <p>Item price limit: {settings.maxBidPrice} sats</p>}
          </div>
        </div>
      </div>
      {/* ActivityLog */}
      <div className="col-span-1 sm:col-span-3 flex items-center justify-center w-full">
        <ActivityLog assets_name={asset} />
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