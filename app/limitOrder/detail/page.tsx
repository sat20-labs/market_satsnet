'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { marketApi } from '@/api';
import { Suspense } from 'react';
import { ChartModule } from '@/components/satoshinet/ChartModule';
import { AssetInfo } from '@/components/satoshinet/AssetInfo';
import DepthPanel from '@/components/satoshinet/limitorder/DepthPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLimitOrderDetailData } from '@/hooks/pages/useLimitOrderDetailData';
import MyOrders from '@/components/satoshinet/common/MyOrders';
import HistoryOrders from '@/components/satoshinet/common/HistoryOrders';
import { useTranslation } from 'react-i18next';
import { Loading } from '@/components/Loading';
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button";
import { ButtonRefresh } from "@/components/buttons/ButtonRefresh";
import { toast } from "sonner";
import { useCommonStore } from '@/store/common';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const LightweightKline = dynamic(() => import('@/components/satoshinet/LightweightKline').then(m => m.LightweightKline), { ssr: false });

function OrderPageContent() {
  const params = useSearchParams();
  const asset = params.get('asset');
  const { t } = useTranslation();
  const { btcFeeRate } = useCommonStore((state) => state);
  // Fetch asset summary
  const { data, isLoading, error } = useQuery({
    queryKey: ['assetSummary', asset],
    queryFn: () => marketApi.getAssetsSummary({ assets_name: asset ?? '' }),
    enabled: !!asset,
  });
  const { ticker, assetBalance, contractData, tickerInfo, isAnalyticsLoading, analyticsData, contractUrl, isContractStatusLoading, refresh, holders } = useLimitOrderDetailData(asset ?? '');
  console.log('tickerInfo', tickerInfo);

  const refreshHandler = () => {
    setTimeout(() => {
      refresh();
    }, 2000);
  }

  const [chartMode, setChartMode] = useState<'line' | 'tv' | 'lw'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('chartMode');
      if (saved === 'line' || saved === 'tv' || saved === 'lw') return saved;
      // backward compatibility with old values
      if (saved === 'simple') return 'line';
      if (saved === 'kline') return 'tv';
    }
    return 'tv'; // 默认 TV K 线
  });

  const [wideChart, setWideChart] = useState(false); // NEW: full-width chart toggle

  const setChartModeAndStore = (mode: 'line' | 'tv' | 'lw') => {
    setChartMode(mode);
    try { window.localStorage.setItem('chartMode', mode); } catch { }
  };

  if (!asset) {
    return <div className="p-4 bg-black text-white w-full">Asset parameter missing.</div>;
  }
  if (isLoading) {
    return <Loading />;
  }
  if (error) {
    return <div className="p-4 bg-black text-white w-full">Error loading data: {error.message}</div>;
  }

  const cancelOrder = async () => {
    const params = {
      action: 'refund',
    };

    const result = await window.sat20.invokeContract_SatsNet(
      contractUrl,
      JSON.stringify(params),
      btcFeeRate.value.toString(),
    );
    if (result.txId) {
      setTimeout(() => {
        refresh();
      }, 1000);
      toast.success(`Order cancelled successfully, txid: ${result.txId}`);
      return;
    } else {
      toast.error('Order cancellation failed');
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-6 p-2 sm:p-4 h-full w-ful">
        {/* Chart and Asset Info Container */}
        <div className={`${wideChart ? 'sm:col-span-3' : 'sm:col-span-2'} flex flex-col gap-4 mb-8 sm:mb-0`}>
          {/* Chart Mode Switch */}
          <div className="flex items-center justify-end gap-2 mb-2 pr-1">
            {/* Wide toggle */}
            <button
              onClick={() => setWideChart(v => !v)}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${wideChart ? 'bg-purple-600/80 text-white border-purple-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'}`}
            >{wideChart ? 'Normal' : 'Wide'}</button>
            <button
              onClick={() => setChartModeAndStore('line')}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${chartMode === 'line' ? 'bg-purple-600/80 text-white border-purple-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'}`}
            >Line</button>
            <button
              onClick={() => setChartModeAndStore('lw')}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${chartMode === 'lw' ? 'bg-purple-600/80 text-white border-purple-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'}`}
            >LW</button>
          </div>
          {/* Tradingview / Simple / Lightweight Chart */}
          <div className="flex items-stretch justify-center min-h-[300px] sm:min-h-[680px] sm:mb-0">
            {chartMode === 'line' && (
              <ChartModule
                asset={asset}
                ticker={ticker}
                isLoading={isAnalyticsLoading}
                analyticsData={analyticsData}
                contractUrl={contractUrl}
                onSwitchToKline={() => setChartModeAndStore('tv')}
              />
            )}

            {chartMode === 'lw' && (
              <div className="w-full h-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg overflow-hidden">
                <LightweightKline symbol={contractUrl} initialResolution="15" />
              </div>
            )}
          </div>
          <div className="flex items-center justify-center w-full h-[320px] sm:h-[220px] mt-7 sm:mt-1 sm:mb-0">
            <AssetInfo depthData={contractData} tickerInfo={tickerInfo} holders={holders} />
          </div>
        </div>
        {!wideChart && (
          <div className="sm:col-span-1 flex items-center justify-center mb-4 mt-3 sm:mb-0 sm:mt-0">
            <div className="max-w-full mx-auto px-4 bg-transparent text-zinc-200 rounded-2xl shadow-lg  w-full h-full">
              {/* DepthPanel 盘口 */}
              {isContractStatusLoading ? (
                <div className="w-full mt-4 text-center text-gray-400">Loading...</div>
              ) : !contractUrl ? (
                <div className="w-full mt-4">
                  <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded">
                    {t('common.swap_notice')}
                  </div>
                </div>
              ) : (
                <DepthPanel
                  contractURL={contractUrl}
                  asset={asset}
                  ticker={ticker}
                  tickerInfo={tickerInfo}
                  assetBalance={assetBalance}
                  balanceLoading={isContractStatusLoading}
                  onOrderSuccess={refreshHandler}
                  depthData={contractData}
                />
              )}
            </div>
          </div>
        )}
      </div>
      {/* 我的订单和所有订单 */}
      <div className="bg-zinc-900 rounded-2xl p-4 mt-4 mb-4">
        <Tabs defaultValue="history">
          <div className="flex justify-between items-center mt-2 mb-4 border-b border-gray-800">
            <TabsList className="flex justify-start w-full bg-transparent">

              <TabsTrigger
                value="history"
                className={cn(
                  "w-28 rounded-none px-4 py-3 text-sm font-medium text-gray-400 hover:text-white focus:text-white border-b-3 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:text-white"
                )}
              >
                {t('common.activities')}
              </TabsTrigger>
              <TabsTrigger
                value="myOrders"
                className={cn(
                  "w-28 rounded-none px-4 py-3 text-sm font-medium text-gray-400 hover:text-white focus:text-white border-b-3 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:text-white"
                )}
              >
                {t('common.my_activities')}
              </TabsTrigger>
            </TabsList>
            <div className="flex justify-between items-center gap-2">
              <Button
                variant="outline"
                className="px-4 mb-2 h-8 text-zinc-400"
                size="sm"
                onClick={cancelOrder}
              >
                Cancel
              </Button>
              <ButtonRefresh className="mx-4 mb-2" loading={isLoading} onRefresh={() => refresh()} />
            </div>
          </div>
          <TabsContent value="myOrders">
            <MyOrders contractURL={contractUrl} type="trade" asset={asset} />
          </TabsContent>
          <TabsContent value="history" className="">
            <HistoryOrders contractURL={contractUrl} type="trade" />
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