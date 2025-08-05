'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { ChartModule } from '@/components/satoshinet/ChartModule';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';


import { useTranscendDetailData } from '@/hooks/pages/useTranscendDetailData';
import MyTranscendOrders from '@/components/satoshinet/common/MyTranscendOrders';
import HistoryTranscendOrders from '@/components/satoshinet/common/HistoryTranscendOrders';
import { Loading } from '@/components/Loading';

function OrderPageContent() {
  const params = useSearchParams();
  const asset = params.get('asset');
  const { t } = useTranslation();

  const {
    tickerInfo,
    transcendData: transcendStatusData,
    isLoading,
    contractUrl,
    satsBalance,
    assetBalance,
    ticker,
    analyticsData,
    isAnalyticsLoading,
    isTranscendStatusLoading,
    isTickerLoading,
    holders,
    refreshTranscendStatus,
    refreshAnalytics,
    refreshBalances,
    refreshAll
  } = useTranscendDetailData(asset ?? '');
  const protocol = useMemo(() => transcendStatusData?.Contract?.assetName?.Protocol || '', [transcendStatusData]);


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
  if (!transcendStatusData) {
    return (
      <div className="w-full mt-4">
        <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded">
          {t('common.transcend_notice')}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div>


        <ChartModule
          asset={asset}
          ticker={ticker}
          isLoading={isAnalyticsLoading}
          analyticsData={analyticsData}
          refresh={refreshAnalytics}
          isRefreshing={isAnalyticsLoading}
        />
      </div>
      <div className="bg-zinc-900 rounded-2xl p-4 mt-4">
        <Tabs defaultValue="myOrders">
          <TabsList className="mb-2">
            <TabsTrigger value="myOrders">{t('common.my_activities')}</TabsTrigger>
            <TabsTrigger value="history">{t('common.activities')}</TabsTrigger>
          </TabsList>
          <TabsContent value="myOrders" className="-mt-10">
            <MyTranscendOrders ticker={ticker} contractURL={contractUrl} type="transcend" />
          </TabsContent>
          <TabsContent value="history" className="-mt-10">
            <HistoryTranscendOrders ticker={ticker} contractURL={contractUrl} type="transcend" />
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