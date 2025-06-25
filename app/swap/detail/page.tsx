'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { Suspense } from 'react';
import { useCommonStore } from '@/store';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { useTranslation } from 'react-i18next';
import { ChartModule } from '@/components/satoshinet/ChartModule';
import Swap from '@/components/satoshinet/swap/Swap';
import SwapMyOrdersPanel from '@/components/satoshinet/swap/SwapMyOrdersPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import WithDraw from '@/components/satoshinet/swap/WithDraw';
import Deposit from '@/components/satoshinet/swap/Deposit';
import { AssetInfo } from '@/components/satoshinet/AssetInfo';
import { AssetInfoCard } from '@/components/AssetInfoCard';
import { useSwapDetailData } from '@/hooks/pages/useSwapDetailData';
import SwapHistoryPanel from '@/components/satoshinet/swap/SwapHistoryPanel';

function Loading() {
  return <div className="p-4 bg-black text-white w-full">Loading...</div>;
}

function OrderPageContent() {
  const params = useSearchParams();
  const asset = params.get('asset');
  const { t } = useTranslation();

  const { tickerInfo, swapData: swapStatusData, isLoading, contractUrl, satsBalance, assetBalance, ticker, analyticsData, isAnalyticsLoading, refresh } = useSwapDetailData(asset ?? '');
  const protocol = useMemo(() => swapStatusData?.Contract?.assetName?.Protocol || '', [swapStatusData]);

  const refreshHandler = () => {
    setTimeout(() => {
      refresh();
    }, 2000);
  }
  if (!asset) {
    return <div className="p-4 bg-black text-white w-full">Asset parameter missing.</div>;
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
        <div className="sm:col-span-2 flex flex-col gap-4 mb-8 sm:mb-0">
          {/* Tradingview Chart */}
          <div className="flex items-center justify-center min-h-[320px] sm:min-h-[640px] sm:mb-0">
            <ChartModule
              ticker={ticker}
              isLoading={isAnalyticsLoading}
              analyticsData={analyticsData}
            />
          </div>
          <div className="flex items-center justify-center w-full h-[210px] sm:h-[220px] mt-7 sm:mt-1 sm:mb-0">
            <AssetInfo depthData={swapStatusData} tickerInfo={tickerInfo} />
          </div>
        </div>
        <div className="sm:col-span-1 flex items-center justify-center mb-4 mt-3 sm:mb-0 sm:mt-0">
          <div className="max-w-full mx-auto pb-4 sm:px-4 bg-transparent text-zinc-200 rounded-2xl shadow-lg w-full h-full">
            <AssetInfoCard
              asset={asset}
              ticker={ticker}
              contractUrl={contractUrl}
              tickerInfo={tickerInfo}
              protocol={protocol}
              swapData={swapStatusData}
            />
            <Tabs defaultValue="swap" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="swap">{t('common.swap')}</TabsTrigger>
                <TabsTrigger value="deposit">{t('common.deposit')}</TabsTrigger>
                <TabsTrigger value="withdraw">{t('common.withdraw')}</TabsTrigger>
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
                />
              </TabsContent>
              <TabsContent value="deposit">
                <Deposit
                  asset={asset}
                  ticker={ticker}
                  contractUrl={contractUrl}
                />
              </TabsContent>
              <TabsContent value="withdraw">
                <WithDraw
                  contractUrl={contractUrl}
                  asset={asset}
                  ticker={ticker}
                  assetBalance={assetBalance}
                  onWithdrawSuccess={() => { refreshHandler() }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <div className="bg-zinc-900 rounded-2xl p-4 mt-4">

        <Tabs defaultValue="myOrders">
          <TabsList className="mb-2">
            <TabsTrigger value="myOrders">我的订单</TabsTrigger>
            <TabsTrigger value="history">所有订单</TabsTrigger>
          </TabsList>
          <TabsContent value="myOrders">
            <SwapMyOrdersPanel contractURL={contractUrl} />
          </TabsContent>
          <TabsContent value="history">
            <SwapHistoryPanel contractURL={contractUrl} />
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