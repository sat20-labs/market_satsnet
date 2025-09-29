'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { marketApi } from '@/api';
import { Suspense } from 'react';
import { ChartModule } from '@/components/satoshinet/ChartModule';
import { AssetInfo } from '@/components/satoshinet/AssetInfo';
import DepthPanel from '@/components/satoshinet/limitorder/DepthPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent, UnderlineTabsList, UnderlineTabsTrigger } from '@/components/ui/tabs';
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
import dynamic from 'next/dynamic';
import { Icon } from '@iconify/react';
import { AssetInfoCardLimitOrder } from '@/components/satoshinet/AssetInfoCardLimitOrder';
import { TikcerHoldersList } from '@/components/satoshinet/swap/TickerHoldersList';

const LightweightKline = dynamic(() => import('@/components/satoshinet/LightweightKline').then(m => m.LightweightKline), { ssr: false });

function OrderPageContent() {
  const params = useSearchParams();
  const asset = params.get('asset');
  const { t } = useTranslation();
  const { btcFeeRate } = useCommonStore((state) => state);

  const [total, setTotal] = useState(0);
  // Fetch asset summary
  const { data, isLoading, error } = useQuery({
    queryKey: ['assetSummary', asset],
    queryFn: () => marketApi.getAssetsSummary({ assets_name: asset ?? '' }),
    enabled: !!asset,
  });
  const { ticker, assetBalance, contractData, tickerInfo, isAnalyticsLoading, analyticsData, contractUrl, isContractStatusLoading, refresh, holders } = useLimitOrderDetailData(asset ?? '');
  //console.log('tickerInfo', tickerInfo);

  useEffect(() => {
    if (data) {
      setTotal(data.total);
    }
  }, [data]);

  const refreshHandler = () => {
    setTimeout(() => {
      refresh();
    }, 2000);
  }

  // Chart height classes (fixed)
  const chartHeights_div = 'h-[35.5rem] sm:h-[39rem]';
  const cHeights = 'h-[27rem] sm:h-[30rem]';
  // Skeleton flags
  const showChartSkeleton = Boolean(isAnalyticsLoading && !analyticsData);
  // LPT ownership flag



  const [chartMode, setChartMode] = useState<'line' | 'lw'>('lw');
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    try {
      const saved = window.localStorage.getItem('chartMode');
      if (saved === 'line' || saved === 'lw') setChartMode(saved);
      else if (saved === 'simple') setChartMode('line');
      else if (saved === 'kline') setChartMode('lw');
    } catch { }
  }, []);
  const setChartModeAndStore = (m: 'line' | 'lw') => { setChartMode(m); try { window.localStorage.setItem('chartMode', m); } catch { } };

  if (!asset) {
    return <div className="p-4 bg-black text-white w-full">Asset parameter missing.</div>;
  }
  if (isLoading) {
    return <Loading />;
  }
  if (error) {
    // 兼容 404 资产未找到的友好提示
    const isNotFound = (typeof error === 'object' && error !== null && 'response' in error && (error as any).response?.status === 404) || error?.message?.includes('404');
    return <div className="p-4 bg-black text-white w-full">{isNotFound ? 'Asset not found' : `failed to load: ${error.message}`}</div>;
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
    <div className="w-full" suppressHydrationWarning>
      <div className="grid grid-cols-1 md:grid-cols-12 sm:gap-6 p-2 sm:pt-4 h-full w-full">
        {/* 左侧：图表、资产信息 */}
        <div className="md:col-span-8 flex flex-col gap-3 order-last md:order-1">
          {/* 桌面端资产信息卡片，图表上方 */}
          <div className="hidden md:block">
            <AssetInfoCardLimitOrder
              asset={asset}
              ticker={ticker}
              contractUrl={contractUrl}

              refresh={refresh}
              isRefreshing={isAnalyticsLoading}
            />
          </div>

          <div className={`relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 ${chartHeights_div}`}>
            {/* Chart Mode Switch */}
            <div className="absolute top-7 sm:top-3 right-4 sm:right-4 z-20 flex gap-2">
              <button onClick={() => setChartModeAndStore('line')} className={`px-2 py-1 rounded text-[11px] border transition-colors ${chartMode === 'line' ? 'btn-gradient text-white border-purple-500' : 'bg-zinc-800/70 text-zinc-400 border-zinc-700 hover:text-zinc-200'}`}>
                <Icon icon="lucide:chart-spline" className="w-4 h-4" />
              </button>
              <button onClick={() => setChartModeAndStore('lw')} className={`px-2 py-1 rounded text-[11px] border transition-colors ${chartMode === 'lw' ? 'btn-gradient text-white border-purple-500' : 'bg-zinc-800/70 text-zinc-400 border-zinc-700 hover:text-zinc-200'}`}>
                <Icon icon="lucide:align-horizontal-distribute-center" className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
            {showChartSkeleton && chartMode === 'line' ? (
              <div className={`w-full ${chartHeights_div} animate-pulse`} />
            ) : (
              <div className={`relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 ${chartHeights_div}`}>
                {hydrated && chartMode === 'line' && (
                  <ChartModule
                    asset={asset}
                    ticker={ticker}
                    isLoading={isAnalyticsLoading}
                    analyticsData={analyticsData}
                    refresh={refresh}
                    isRefreshing={isAnalyticsLoading}
                    chartHeight={cHeights}
                    contractUrl={contractUrl}
                    onSwitchToKline={() => setChartModeAndStore('lw')}
                  />
                )}
                {hydrated && chartMode === 'lw' && (
                  <div className="w-full h-full">
                    <LightweightKline symbol={contractUrl} initialResolution="4H" chartHeights={{ volumeRatio: 0.3, height: cHeights }} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 移动端资产信息折叠 */}
          <div className="md:hidden relative z-10">
            <details className="rounded-xl border border-zinc-800 bg-zinc-900">
              <summary className="px-3 py-2 cursor-pointer text-sm text-zinc-300 select-none">{t('common.assetTradeInfo')}</summary>
              <div className="p-3">
                <AssetInfo depthData={contractData} tickerInfo={tickerInfo} holders={holders} />
              </div>
            </details>
          </div>
          {/* 桌面端资产信息 */}
          <div className="hidden md:block w-full relative z-10">
            <AssetInfo depthData={contractData} tickerInfo={tickerInfo} holders={holders} />
          </div>
        </div>

        {/* 右侧：下单面板，sticky 效果 */}
        <div className="md:col-span-4 order-first md:order-2 lg:sticky lg:top-4 self-start">
          {/* 手机端资产信息卡片最上方显示 */}
          <div className="block md:hidden">
            <AssetInfoCardLimitOrder
              asset={asset}
              ticker={ticker}
              contractUrl={contractUrl}
              refresh={refresh}
              isRefreshing={isAnalyticsLoading}
            />
          </div>
          <div className="max-w-full mx-auto pb-4 bg-transparent text-zinc-200 rounded-xl shadow-lg w-full">
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
          </div>
        </div>
      </div>

      {/* 全宽底部 Tabs 区域 */}
      <div className="w-full px-2 sm:px-2 mt-4 sm:mt-4 bg-transparent">
        <Tabs defaultValue="history" className="w-full" suppressHydrationWarning>
          <div className="flex items-center justify-between border-b border-zinc-800">
            <TabsList className="text-sm mb-2 whitespace-nowrap" suppressHydrationWarning>
              <TabsTrigger value="history" className="flex-1">{t('common.activities')}</TabsTrigger>
              <TabsTrigger value="myOrders" className="flex-1">{t('common.my_activities')}</TabsTrigger>
              <TabsTrigger value="holders" suppressHydrationWarning>{t('common.holder') || 'Holders'}</TabsTrigger>
            </TabsList>
            <div className="flex items-center mr-2 mb-2 gap-2">
              <Button
                variant="outline"
                className="px-4 h-9"
                size="sm"
                onClick={cancelOrder}
              >
                Cancel
              </Button>
            </div>
          </div>

          <TabsContent value="history" className="bg-zinc-950/80">
            <HistoryOrders contractURL={contractUrl} type="trade" />
          </TabsContent>
          <TabsContent value="myOrders" className="bg-zinc-950/80">
            <MyOrders contractURL={contractUrl} type="trade" asset={asset} />
          </TabsContent>
          <TabsContent value="holders" className="mt-4 bg-zinc-950/80">
            <TikcerHoldersList asset={asset} onTotalChange={setTotal} tickerInfo={tickerInfo} />
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