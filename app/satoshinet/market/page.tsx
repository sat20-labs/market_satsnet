'use client';

import { useSearchParams } from 'next/navigation';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import useSWR from 'swr';
import SatoshiNetMarket from '@/components/satoshinet/SatoshiNetMarket';
// import { getAssetsSummary } from '@/api'; // 保留接口调用逻辑

export default function SatoshiNetMarketPage() {
  const params = useSearchParams();
  const ticker = params.get('ticker'); // 获取 URL 参数中的 ticker
  const assetsType = params.get('assets_type'); // 获取 URL 参数中的 assets_type
  const chain = 'Bitcoin'; // Test use Bitcoin, 实际应该用 SatoshiNet
  const { address, network } = useReactWalletStore((state) => state);

  // 使用 useSWR 获取资产数据（暂时注释掉接口调用）
   const { data, error, isLoading } = useSWR(
      `getAssetsSummary-${chain}-${network}-${ticker}-${assetsType}`,
      async () => {
        console.log('Fetching asset data for ticker:', ticker);
        try {
          // 模拟接口调用逻辑
          // return await getAssetsSummary({ assets_name: ticker ?? undefined, assets_type: assetsType ?? undefined });
          return mockData; // 返回模拟数据
        } catch (error) {
          console.error('Error fetching asset data:', error);
          throw error;
        }
      }
    );

  // 模拟数据
  const mockData = {
    protocol: 'Ordx',
    assetType: assetsType ?? 'OrdX',
    assetId: '0x22344555546547',
    assetName:  ticker ??'rarepizza',
    assetSymbol: 'rarepizza',
    assetDescription: 'rarepizza is a rare pizza',
    assetLogo: 'https://apiprd.ordx.market/files/6b682682772bea93958319727aad099b9a96a0cc10b8aeffa0f8a88ce07f106d.png',
    floorPrice: 0.0001,
    floorPriceUSD: 0.00000001,

    price: 0.0001,    
    volume: 1000,
    volumeUSD: 10000,
    marketCap: 5000,
    marketCapUSD: 500000,
    holders: 5300,
    transactions: 84596,
    mintProgress: '100%',
  };



  if (isLoading) {
    return <div className="text-white">Loading...</div>;
  }

  if (error || !data) {
    return <div className="text-white">No data available for the selected asset.</div>;
  }

  return (
    <div className="p-4 bg-black text-white w-full">     
      {/* 将资产信息传递到子组件 */}
      <SatoshiNetMarket ticker={ticker} assetsType={assetsType} assetData={data} />
    </div>
  );
}