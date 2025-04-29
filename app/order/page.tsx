'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { marketApi } from '@/api';
import { Suspense } from 'react';
import { ChartModule } from '@/components/satoshinet/ChartModule';
import { AssetInfo } from '@/components/satoshinet/AssetInfo';
import { ActivityLog } from '@/components/satoshinet/ActivityLog';
import OrderBookHeader from '@/components/satoshinet/orderbook/OrderBookHearder';
import TakeOrder from '@/components/satoshinet/orderbook/TakeOrder';
import MakeOrder from '@/components/satoshinet/orderbook/MakeOrder';
import { useWalletStore } from '@/store';
import { satsToBitcoin, formatBtcAmount } from '@/utils';

function Loading() {
  return <div className="p-4 bg-black text-white w-full">Loading...</div>;
}

function OrderPageContent() {
  const params = useSearchParams();
  const router = useRouter();
  const asset = params.get('asset');

  // Fetch asset summary
  const { data, isLoading, error } = useQuery({
    queryKey: ['assetSummary', asset],
    queryFn: () => marketApi.getAssetsSummary({ assets_name: asset ?? '' }),
    enabled: !!asset,
  });

  // Fetch ticker info
  const [tickerInfo, setTickerInfo] = useState<any>(null);
  useEffect(() => {
    if (!asset) return;
    async function fetchTickerInfo() {
      try {
        const infoRes = await window.sat20.getTickerInfo(asset);
        if (infoRes?.ticker) {
          const { ticker } = infoRes;
          const result = JSON.parse(ticker);
          setTickerInfo(result);
        }
      } catch (e) {
        setTickerInfo(null);
      }
    }
    fetchTickerInfo();
  }, [asset]);

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
  const {  balance } = useWalletStore();
  const showAmount = useMemo(() => {
    const btcValue = satsToBitcoin(balance.availableAmt);
    return formatBtcAmount(btcValue);
  }, [balance]);
  const userWallet = {
    btcBalance: typeof showAmount === 'string' ? parseFloat(showAmount) : showAmount || 0,
    assetBalance: 1000,
    address: '',
  };
  const handleTabChange = (tab: 'takeOrder' | 'makeOrder') => {
    setActiveTab(tab);
  };
  const [settings, setSettings] = useState({ showOngoingTrades: false, maxBidPrice: 0 });
  const handleSettingsChange = (newSettings: { showOngoingTrades: boolean; maxBidPrice: number }) => {
    setSettings(newSettings);
  };
  console.log(tickerInfo);
  
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
            onRefresh={() => {}}
            onSettingsChange={handleSettingsChange}
          />
          {activeTab === 'takeOrder' ? (
            <TakeOrder assetInfo={{
              assetLogo: summary.assetLogo,
              assetName: summary.assetName,
              AssetId: summary.assetId,
              floorPrice: parseFloat(summary.floorPrice),
            }} tickerInfo={tickerInfo} />
          ) : (
            <MakeOrder assetInfo={{
              assetLogo: summary.assetLogo,
              assetName: summary.assetName,
              AssetId: summary.assetId,
              floorPrice: parseFloat(summary.floorPrice),
            }} tickerInfo={tickerInfo} />
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