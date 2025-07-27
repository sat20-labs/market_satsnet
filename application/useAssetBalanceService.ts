import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAssetBalanceStore, AssetBalance } from '@/stores/assetBalanceStore';
import { useEffect } from 'react';

// 你需要实现 getAssetAmount_SatsNet API 适配器
// 这里假设它返回 { availableAmt, lockedAmt }
async function getAssetAmount_SatsNet(address: string, assetName: string): Promise<AssetBalance> {
  // @ts-ignore
  return await window.sat20.getAssetAmount_SatsNet(address, assetName);
}

export function useAssetBalance(address: string, assetName: string) {
  const setBalance = useAssetBalanceStore((s) => s.setBalance);
  const balance = useAssetBalanceStore((s) => s.getBalance(assetName));
  const queryClient = useQueryClient();
  const query = useQuery<AssetBalance, Error>({
    queryKey: ['assetBalance', address, assetName],
    queryFn: () => getAssetAmount_SatsNet(address, assetName),
    enabled: !!address && !!assetName,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    if (query.data) {
      setBalance(assetName, {
        availableAmt: Number(query.data.availableAmt),
        lockedAmt: Number(query.data.lockedAmt),
      });
    }
  }, [query.data, assetName, setBalance]);
  return { balance, isLoading: query.isLoading || query.isFetching, refetch: query.refetch };
} 