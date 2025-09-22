'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { ChartModule } from '@/components/satoshinet/ChartModule';
import Swap from '@/components/satoshinet/swap/Swap';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import WithDraw from '@/components/satoshinet/swap/WithDraw';
import Deposit from '@/components/satoshinet/swap/Deposit';
import AddLiquidity from '@/components/satoshinet/swap/AddLiquidity';
import RemoveLiquidity from '@/components/satoshinet/swap/RemoveLiquidity';
import LptHoldersList from '@/components/satoshinet/swap/LptHoldersList';
import { AssetInfo } from '@/components/satoshinet/AssetInfo';
import { AssetInfoCard } from '@/components/AssetInfoCard';
import { useSwapDetailData } from '@/hooks/pages/useSwapDetailData';
import { useCommonStore } from '@/store';
import MySwapOrders from '@/components/satoshinet/common/MySwapOrders';
import HistorySwapOrders from '@/components/satoshinet/common/HistorySwapOrders';
import { Loading } from '@/components/Loading';

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


  const refreshHandler = () => {
    setTimeout(() => {
      refreshAll();
    }, 2000);
  }

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

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-6 p-2 sm:p-4 h-full w-ful">
        {/* Chart and Asset Info Container */}
        <div className="sm:col-span-2 flex flex-col gap-1 mb-8 sm:mb-0">
          {/* Tradingview Chart */}
          <div className="flex items-center justify-center min-h-[320px] sm:min-h-[640px] sm:mb-0">
            <ChartModule
              asset={asset}
              ticker={ticker}
              isLoading={isAnalyticsLoading}
              analyticsData={analyticsData}
              refresh={refreshAnalytics}
              isRefreshing={isAnalyticsLoading}
            />
          </div>
          <div className="flex items-center justify-center w-full h-[320px] sm:h-[220px] sm:mt-1 sm:mb-0">
            <AssetInfo depthData={swapStatusData} tickerInfo={tickerInfo} holders={holders} />
          </div>
        </div>
        <div className="sm:col-span-1 flex items-center justify-center mb-1 mt-4 sm:mb-0 sm:mt-0">
          <div className="max-w-full mx-auto pb-4 sm:px-4 bg-transparent text-zinc-200 rounded-2xl shadow-lg w-full h-full">
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
            <Tabs defaultValue="swap" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="swap">{t('common.swap')}</TabsTrigger>
                <TabsTrigger value="deposit">{t('common.deposit')}</TabsTrigger>
                <TabsTrigger value="withdraw">{t('common.withdraw')}</TabsTrigger>
                <TabsTrigger value="addLiquidity">{t('common.addLiquidity')}</TabsTrigger>
                <TabsTrigger value="removeLiquidity">{t('common.removeLiquidity')}</TabsTrigger>

              </TabsList>
              <TabsContent value="swap">
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
                />
              </TabsContent>
              <TabsContent value="deposit">
                <Deposit
                  asset={asset}
                  ticker={ticker}
                  contractUrl={contractUrl}
                  refresh={refreshBalances}
                  isRefreshing={isSwapStatusLoading}
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
                />
              </TabsContent>
              <TabsContent value="addLiquidity">
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
                />
              </TabsContent>
              <TabsContent value="removeLiquidity">
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
                />
              </TabsContent>
            </Tabs>

            {/* LPT Holders List - Only show in testnet */}
            <LptHoldersList
              asset={asset}
              ticker={ticker}
              contractUrl={contractUrl}
              tickerInfo={tickerInfo}
              refresh={refreshAll}
              isRefreshing={isSwapStatusLoading}
            />
          </div>
        </div>
      </div>
      <div className="bg-zinc-900 rounded-2xl p-4 mt-1">
        <Tabs defaultValue="history">
          <TabsList className="mb-2">
            <TabsTrigger value="history">{t('common.activities')}</TabsTrigger>
            <TabsTrigger value="myOrders">{t('common.my_activities')}</TabsTrigger>
          </TabsList>
          <TabsContent value="myOrders" className="-mt-8">
            <MySwapOrders ticker={ticker} contractURL={contractUrl} type="swap" />
          </TabsContent>
          <TabsContent value="history" className="-mt-8">
            <HistorySwapOrders ticker={ticker} contractURL={contractUrl} type="swap" />
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