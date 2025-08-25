import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientApi } from '@/api';
import { useAssetBalanceStore, AssetBalance } from '@/stores/assetBalanceStore';
import { useEffect, useMemo } from 'react';

// 你需要实现 getAssetAmount_SatsNet API 适配器
// 这里假设它返回 { availableAmt, lockedAmt }
async function getAssetAmount_SatsNet(address: string, assetName: string): Promise<AssetBalance> {
  // @ts-ignore
  return await window.sat20.getAssetAmount_SatsNet(address, assetName);
}

export function useAssetBalance(address: string, assetName: string) {
  // const setBalance = useAssetBalanceStore((s) => s.setBalance);
  // const balance = useAssetBalanceStore((s) => s.getBalance(assetName));
  const { data, isLoading, isFetching, refetch } = useQuery<any, Error>({
    queryKey: ['getAddressSummary', address],
    queryFn: () => clientApi.getAddressSummary(address),
    enabled: !!address,
    refetchInterval: 6000,
    refetchIntervalInBackground: false,
  });
  const list = useMemo(() => {
    return data?.data?.map((item: any) => {
      const { Protocol, Type, Ticker } = item.Name;
      let key;
      if (Protocol === '' && Type === '') {
        key = '::'
      } else {
        key = `${Protocol}:${Type}:${Ticker}`;
      }
      return {
        key,
        ...item,
      };
    }) || [];
  }, [data]);
  console.log('list', assetName, list);
  const balance = useMemo(() => {
    const _v = list.find((item: any) => item.key === assetName);
    console.log('balance', assetName, _v);
    if (_v) {
      return {
        availableAmt: Number(_v.Amount),
        lockedAmt: 0,
      };
    }
    return {
      availableAmt: 0,
      lockedAmt: 0,
    };
  }, [list, assetName]);
  return { balance, isLoading, isFetching, refetch };
} 