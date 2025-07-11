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

function OrderPageContent() {
  const params = useSearchParams();
  const asset = params.get('asset');
  const { t } = useTranslation();
  
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

  if (!asset) {
    return <div className="p-4 bg-black text-white w-full">Asset parameter missing.</div>;
  }
  if (isLoading) {
    return <Loading />;
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
            <ChartModule
              asset={asset}
              ticker={ticker}
              isLoading={isAnalyticsLoading}
              analyticsData={analyticsData}
            />
          </div>
          <div className="flex items-center justify-center w-full h-[210px] sm:h-[220px] mt-7 sm:mt-1 sm:mb-0">
            <AssetInfo depthData={contractData} tickerInfo={tickerInfo} holders={holders} />
          </div>
        </div>
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
      </div>
      {/* 我的订单和所有订单 */}
      <div className="bg-zinc-900 rounded-2xl p-4 mt-4">
        <Tabs defaultValue="myOrders">
          <TabsList className="mb-2">
            <TabsTrigger value="myOrders">{t('common.my_activities')}</TabsTrigger>
            <TabsTrigger value="history">{t('common.activities')}</TabsTrigger>
          </TabsList>
          <TabsContent value="myOrders">
            <MyOrders contractURL={contractUrl} type="trade" asset={asset} />
          </TabsContent>
          <TabsContent value="history">
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