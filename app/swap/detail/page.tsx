'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { ChartModule } from '@/components/satoshinet/ChartModule';
import Swap from '@/components/satoshinet/swap/Swap';
import { Tabs, TabsList, TabsTrigger, TabsContent, UnderlineTabsList, UnderlineTabsTrigger } from '@/components/ui/tabs';
import { ButtonRefresh } from '@/components/buttons/ButtonRefresh';
import WithDraw from '@/components/satoshinet/swap/WithDraw';
import Deposit from '@/components/satoshinet/swap/Deposit';
import AddLiquidity from '@/components/satoshinet/swap/AddLiquidity';
import RemoveLiquidity from '@/components/satoshinet/swap/RemoveLiquidity';
import LptHoldersList from '@/components/satoshinet/swap/LptHoldersList';
import { AssetInfo } from '@/components/satoshinet/AssetInfo';
import { AssetInfoCard } from '@/components/AssetInfoCard';
import { useSwapDetailData } from '@/hooks/pages/useSwapDetailData';
import { useCommonStore } from '@/store';
import HistorySwapOrders from '@/components/satoshinet/common/HistorySwapOrders';
import { Loading } from '@/components/Loading';
import MyOrders from '@/components/satoshinet/common/MySwapOrders';
import { TikcerHoldersList } from '@/components/satoshinet/swap/TickerHoldersList';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';

import dynamic from 'next/dynamic';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

const LightweightKline = dynamic(() => import('@/components/satoshinet/LightweightKline').then(m => m.LightweightKline), { ssr: false });

// 维护中的 Runes 资产列表
const MAINTENANCE_RUNES = [
  'DOG•GO•TO•THE•MOON',
  'SHIB•SHIB•SHIB',
  'LOBO•THE•WOLF•PUP',
  'FUNNY•FISH•MASK'
];

function OrderPageContent() {
  const params = useSearchParams();
  const asset = params.get('asset');
  const { t } = useTranslation();
  const { network } = useCommonStore();

  const {
    tickerInfo,
    swapData: swapStatusData,
    isLoading,
    contractUrl,
    satsBalance,
    assetBalance,
    ticker,
    analyticsData,
    isAnalyticsLoading,
    isSwapStatusLoading,
    isTickerLoading,
    holders,
    lptAmt,
    userContractStatus,
    userOperationHistory,
    refreshSwapStatus,
    refreshAnalytics,
    refreshBalances,
    refreshAll
  } = useSwapDetailData(asset ?? '');
  const protocol = useMemo(() => swapStatusData?.Contract?.assetName?.Protocol || '', [swapStatusData]);
  const { address } = useReactWalletStore();

  // 判断是否为维护中的资产
  const isUnderMaintenance = useMemo(() => {
    const assetName = swapStatusData?.Contract?.assetName?.Ticker || ticker;
    return protocol === 'runes' && MAINTENANCE_RUNES.includes(assetName);
  }, [protocol, swapStatusData, ticker]);

  // 处理维护中资产的操作
  const handleMaintenanceAction = () => {
    toast.warning(t('common.contract_maintenance'));
  };

  // Chart height classes (fixed)
  const chartHeights_div = 'h-[37.5rem] sm:h-[41rem]';
  const cHeights = 'h-[26rem] sm:h-[32rem]';
  // Skeleton flags
  const showChartSkeleton = Boolean(isAnalyticsLoading && !analyticsData);
  const showRightCardSkeleton = Boolean(isSwapStatusLoading && !swapStatusData);
  // LPT ownership flag
  const hasLpt = useMemo(() => (lptAmt?.Value ?? 0) > 0, [lptAmt]);

  const [total, setTotal] = useState(0);

  const refreshHandler = () => {
    setTimeout(() => {
      refreshAll();
    }, 2000);
  }

  // Hydration-safe chart mode (avoid SSR/CSR text mismatch)
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
  if (!swapStatusData) {
    return (
      <div className="w-full mt-4">
        <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded">
          {t('common.swap_notice')}
        </div>
      </div>
    );
  }

  // Global hydration guard: avoid SSR/CSR text mismatch (translations, store-derived text, wallet state)
  if (!hydrated) {
    return <div className="w-full flex items-center justify-center py-10" suppressHydrationWarning><Loading /></div>;
  }

  return (
    <div className="w-full" suppressHydrationWarning>
      <div className="grid grid-cols-1 md:grid-cols-12 sm:gap-6 p-2 sm:pt-4 h-full w-full">
        {/* Chart and Asset Info Container */}
        <div className="md:col-span-8 flex flex-col gap-3 order-last md:order-1">

          {/* Tradingview Chart or skeleton */}
          <div className={`relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 ${chartHeights_div}`}>
            <div className="absolute top-5 sm:top-3 right-2 z-20 flex gap-2">
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
              <div className={`w-full ${chartHeights_div}`}>
                {hydrated && chartMode === 'line' && (
                  <ChartModule
                    asset={asset}
                    ticker={ticker}
                    isLoading={isAnalyticsLoading}
                    analyticsData={analyticsData}
                    refresh={refreshAnalytics}
                    isRefreshing={isAnalyticsLoading}
                    chartHeight={cHeights}
                    contractUrl={contractUrl}
                    onSwitchToKline={() => setChartModeAndStore('lw')}
                  />
                )}
                {/* {chartMode === 'tv' && (
                  <div className="w-full h-full">
                    <TVChart contractUrl={contractUrl} interval="15" />
                  </div>
                )} */}
                {hydrated && chartMode === 'lw' && (
                  <div className="w-full h-full">
                    <LightweightKline symbol={contractUrl} initialResolution="4H" chartHeights={{ volumeRatio: 0.3, height: cHeights }} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile accordion for Asset Info */}
          <div className="md:hidden relative z-10">
            <details className="rounded-xl border border-zinc-800 bg-zinc-900">
              <summary className="px-3 py-2 cursor-pointer text-sm text-zinc-300 select-none">{t('common.assetTradeInfo')}</summary>
              <div className="p-3">
                <AssetInfo depthData={swapStatusData} tickerInfo={tickerInfo} holders={holders} />
              </div>
            </details>
          </div>

          {/* Desktop Asset Info */}
          <div className={`hidden md:block w-full relative z-10`}>
            <AssetInfo depthData={swapStatusData} tickerInfo={tickerInfo} holders={holders} />
          </div>
        </div>
        {/* Right: Swap/Deposit/Withdraw panel */}
        <div className="md:col-span-4 order-first md:order-2 lg:sticky lg:top-4 self-start">
          <div className="max-w-full mx-auto pb-4 bg-transparent text-zinc-200 rounded-xl shadow-lg w-full">
            <Tabs defaultValue="swap" className="w-full">
              <TabsList className="mb-2 whitespace-nowrap" suppressHydrationWarning>
                <TabsTrigger value="swap" className="flex-1" suppressHydrationWarning>{t('common.swap')}</TabsTrigger>
                <TabsTrigger value="liquidity" className="flex-1" suppressHydrationWarning>{t('common.Liquidity')}</TabsTrigger>
                <TabsTrigger value="deposit" className="flex-1" suppressHydrationWarning>{t('common.deposit')}</TabsTrigger>
                <TabsTrigger value="withdraw" className="flex-1" suppressHydrationWarning>{t('common.withdraw')}</TabsTrigger>
              </TabsList>
              <TabsContent value="swap">
                {showRightCardSkeleton ? (
                  <div className="h-28 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse mb-4" />
                ) : (
                  <AssetInfoCard
                    asset={asset}
                    ticker={ticker}
                    contractUrl={contractUrl}
                    tickerInfo={tickerInfo}
                    protocol={protocol}
                    swapData={swapStatusData}
                    refresh={refreshSwapStatus}
                    isRefreshing={isSwapStatusLoading}
                  />
                )}
                <Swap
                  asset={asset}
                  ticker={ticker}
                  contractUrl={contractUrl}
                  tickerInfo={tickerInfo}
                  onSwapSuccess={() => { refreshHandler() }}
                  swapData={swapStatusData}
                  satsBalance={satsBalance}
                  assetBalance={assetBalance}
                  refresh={refreshAll}
                  isRefreshing={isSwapStatusLoading || isAnalyticsLoading || isTickerLoading}
                  isUnderMaintenance={isUnderMaintenance}
                  onMaintenanceAction={handleMaintenanceAction}
                />
              </TabsContent>
              <TabsContent value="deposit">
                <Deposit
                  asset={asset}
                  ticker={ticker}
                  contractUrl={contractUrl}
                  refresh={refreshBalances}
                  isRefreshing={isSwapStatusLoading}
                  swapData={swapStatusData}
                  isUnderMaintenance={isUnderMaintenance}
                  onMaintenanceAction={handleMaintenanceAction}
                />
              </TabsContent>
              <TabsContent value="withdraw">
                <WithDraw
                  contractUrl={contractUrl}
                  asset={asset}
                  ticker={ticker}
                  assetBalance={assetBalance}
                  onWithdrawSuccess={() => { refreshHandler() }}
                  refresh={refreshBalances}
                  isRefreshing={isSwapStatusLoading}
                  swapData={swapStatusData}
                  isUnderMaintenance={isUnderMaintenance}
                  onMaintenanceAction={handleMaintenanceAction}
                />
              </TabsContent>
              <TabsContent value="liquidity">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4  shadow-lg shadow-sky-500/50">
                  <Tabs defaultValue={hasLpt ? 'remove' : 'add'} className="w-full">
                    <div className="flex items-center justify-between">
                      <UnderlineTabsList className="mb-0 flex-1 border-b border-zinc-800">
                        <UnderlineTabsTrigger value="add">{t('common.add')}</UnderlineTabsTrigger>
                        <UnderlineTabsTrigger value="remove">{t('common.remove')}</UnderlineTabsTrigger>
                      </UnderlineTabsList>
                      <ButtonRefresh onRefresh={refreshBalances} loading={isSwapStatusLoading} className="ml-2 bg-zinc-800/50" />
                    </div>
                    <TabsContent value="add">
                      <AddLiquidity
                        asset={asset}
                        ticker={ticker}
                        contractUrl={contractUrl}
                        refresh={refreshBalances}
                        isRefreshing={isSwapStatusLoading}
                        tickerInfo={tickerInfo}
                        swapData={swapStatusData}
                        assetBalance={assetBalance}
                        satsBalance={satsBalance}
                        operationHistory={userOperationHistory?.addLiq}
                        isUnderMaintenance={isUnderMaintenance}
                        onMaintenanceAction={handleMaintenanceAction}
                      />
                    </TabsContent>
                    <TabsContent value="remove">
                      <RemoveLiquidity
                        contractUrl={contractUrl}
                        asset={asset}
                        ticker={ticker}
                        assetBalance={assetBalance}
                        satsBalance={satsBalance}
                        onRemoveLiquiditySuccess={() => { refreshHandler() }}
                        refresh={refreshBalances}
                        isRefreshing={isSwapStatusLoading}
                        tickerInfo={tickerInfo}
                        swapData={swapStatusData}
                        lptAmt={lptAmt}
                        operationHistory={userOperationHistory?.removeLiq}
                        isUnderMaintenance={isUnderMaintenance}
                        onMaintenanceAction={handleMaintenanceAction}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </TabsContent>
            </Tabs>

            {/* <div className="mt-2">
              <div className="md:hidden">
                <details className="rounded-xl border border-zinc-800 bg-zinc-900">
                  <summary className="px-3 py-2 cursor-pointer text-sm text-zinc-300 select-none">LPT Holders</summary>
                  <div className="p-3">
                    <LptHoldersList
                      asset={asset}
                      ticker={ticker}
                      contractUrl={contractUrl}
                      tickerInfo={tickerInfo}
                      refresh={refreshAll}
                      isRefreshing={isSwapStatusLoading}
                    />
                  </div>
                </details>
              </div>
              <div className="hidden md:block">
                <LptHoldersList
                  asset={asset}
                  ticker={ticker}
                  contractUrl={contractUrl}
                  tickerInfo={tickerInfo}
                  refresh={refreshAll}
                  isRefreshing={isSwapStatusLoading}
                />
              </div>
            </div> */}

          </div>
        </div>
      </div>

      {/* Full-width bottom tabs section */}
      <div className="w-full px-2 sm:px-2 mt-4 sm:m-1 bg-transparent">
        <Tabs defaultValue="activities" className="w-full" suppressHydrationWarning>
          <UnderlineTabsList className="mb-2 text-xs" suppressHydrationWarning>
            <UnderlineTabsTrigger value="activities" suppressHydrationWarning>{t('common.activity') || 'Activities'}</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="myactivities" suppressHydrationWarning>{t('common.my_activities') || 'My Activities'}</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="holders" suppressHydrationWarning>{t('common.holder') || 'Holders'}</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="lpholders" suppressHydrationWarning>{t('common.lptHolders') || 'LP-Holders'}</UnderlineTabsTrigger>
          </UnderlineTabsList>
          <TabsContent value="activities" className="mt-4 bg-zinc-950/80">
            <HistorySwapOrders contractURL={contractUrl} type="swap" ticker={ticker} />
          </TabsContent>
          <TabsContent value="myactivities" className="mt-4 bg-zinc-950/80">
            <MyOrders contractURL={contractUrl} type="swap" ticker={ticker} />
          </TabsContent>
          <TabsContent value="holders" className="mt-4 bg-zinc-950/80">
            <TikcerHoldersList asset={asset} onTotalChange={setTotal} tickerInfo={tickerInfo} />
          </TabsContent>
          <TabsContent value="lpholders" className="mt-4 bg-zinc-950/80">
            <LptHoldersList
              asset={asset}
              ticker={ticker}
              contractUrl={contractUrl}
              tickerInfo={tickerInfo}
              refresh={refreshAll}
              isRefreshing={isSwapStatusLoading}
            />
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