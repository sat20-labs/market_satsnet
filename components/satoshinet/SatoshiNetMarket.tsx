'use client';

import { ChartModule } from '@/components/satoshinet/ChartModule';
import OrderBookPage from '@/components/satoshinet/OrderBookPage';
import { AssetInfo } from '@/components/satoshinet/AssetInfo';
import { ActivityLog } from '@/components/satoshinet/ActivityLog';

interface SatoshiNetMarketProps {
  asset: string | null;
  assetData: any;
}

export default function SatoshiNetMarket({ asset, assetData }: SatoshiNetMarketProps) {
  const mockActivityLogData = [
    { event: 'Buy', role: 'Taker', quantity: 13695, price: 0.000275, time: '7d ago' },
    { event: 'Sell', role: 'Maker', quantity: 6547, price: 0.000280, time: '8d ago' },
  ];


  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-6 sm:p-4 h-full w-full bg-black text-white">
      {/* Chart and Asset Info Container */}
      <div className="sm:col-span-2 flex flex-col gap-4 mb-8 sm:mb-0">
        {/* Tradingview Chart */}
        <div className="flex items-center justify-center h-[300px] sm:h-[540px] mb-12 sm:mb-0">
          {/* <ChartModule ticker={ticker} /> */}
        </div>

        {/* Asset Info */}
        <div className="flex items-center justify-center w-full h-[200px] sm:h-[280px] mt-10 sm:mb-0">
          {/* <AssetInfo assetData={assetData} /> */}
        </div>
      </div>

      <div className="sm:col-span-1 flex items-center justify-center mb-4 mt-3 sm:mb-0 sm:mt-0">
        <OrderBookPage assetData={assetData} />
      </div>

      {/* ActivityLog */}
      <div className="col-span-1 sm:col-span-3 flex items-center justify-center w-full">
        <ActivityLog assets_name={asset} />
      </div>
    </div>
  );
}