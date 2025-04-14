'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import SatoshiNetMarket from '@/components/satoshinet/SatoshiNetMarket';
import { marketApi } from '@/api';


export default function SatoshiNetMarketPage() {
  const params = useSearchParams();
  const router = useRouter();
  const asset = params.get('asset');

  const { data, isLoading, error } = useQuery({
    // Query key depends on the asset
    queryKey: ['assetSummary', asset],
    // Query function calls getAssetsSummary with the asset
    queryFn: () => marketApi.getAssetsSummary({ assets_name: asset ?? '' }),
    // Only run the query if asset is not null or undefined
    enabled: !!asset,
  });

  // Keep useMemo to extract and transform summary, depends on the data from useQuery
  const summary = useMemo(() => {
    const summaryData = data?.data?.summary;
    if (!summaryData) {
      // Return an empty object or a default structure if summaryData is not available
      return {};
    }

    // Perform the mapping
    return {
      protocol: summaryData.assets_name?.Protocol ?? 'N/A',
      // assetId: Not available in API response
      nickname: summaryData.nickname || 'N/A',
      assetName: `${summaryData.assets_name?.Protocol}:${summaryData.assets_name?.Type}:${summaryData.assets_name?.Ticker}`,
      assetSymbol: summaryData.assets_name?.Ticker ?? 'N/A',
      assetDescription: summaryData.description ?? '',
      assetLogo: summaryData.logo ?? '', // Provide a default logo URL if desired
      floorPrice: summaryData.lowest_price ?? 0,
      // floorPriceUSD: Not available
      // Use floorPrice for price as per mock data structure
      price: summaryData.lowest_price ?? 0,
      volume: summaryData.tx_total_volume ?? 0,
      // volumeUSD: Not available
      // API indicates market_cap can be null, handle it
      marketCap: summaryData.market_cap === null ? null : (summaryData.market_cap ?? 0),
      // marketCapUSD: Not available
      holders: summaryData.holder_count ?? 0,
      transactions: summaryData.tx_order_count ?? 0,
      // mintProgress: Not available
    };
  }, [data]); // Dependency remains on the raw data from useQuery

  // Handle loading and error states (optional but recommended)
  if (!asset) {
    return <div className="p-4 bg-black text-white w-full">Asset parameter missing.</div>;
  }

  if (isLoading) {
    return <div className="p-4 bg-black text-white w-full">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 bg-black text-white w-full">Error loading data: {error.message}</div>;
  }

  // 模拟数据
  // const mockData = {
  //   protocol: 'Ordx',
  //   assetType: assetsType ?? 'OrdX',
  //   assetId: '0x22344555546547',
  //   assetName:  ticker ??'rarepizza',
  //   assetSymbol: 'rarepizza',
  //   assetDescription: 'rarepizza is a rare pizza',
  //   assetLogo: 'https://apiprd.ordx.market/files/6b682682772bea93958319727aad099b9a96a0cc10b8aeffa0f8a88ce07f106d.png',
  //   floorPrice: 0.0001,
  //   floorPriceUSD: 0.00000001,

  //   price: 0.0001,    
  //   volume: 1000,
  //   volumeUSD: 10000,
  //   marketCap: 5000,
  //   marketCapUSD: 500000,
  //   holders: 5300,
  //   transactions: 84596,
  //   mintProgress: '100%',
  // };



  return (
    <div className="p-4 bg-black text-white w-full">
      {/* 将资产信息传递到子组件 */}
      <SatoshiNetMarket asset={asset} assetData={summary} />
    </div>
  );
}