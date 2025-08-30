import { useQuery } from '@tanstack/react-query';
import { fetchAmmPoolStatus } from '@/infrastructure/api/amm';
import { toAmmPool } from '@/domain/ammAdapter';
import { useAmmPoolStore } from '@/stores/ammPoolStore';
import { useEffect } from 'react';

export function useAmmPool(contractUrl: string) {
  const setPool = useAmmPoolStore((s) => s.setPool);
  const pool = useAmmPoolStore((s) => s.getPool(contractUrl));

  const query = useQuery({
    queryKey: ['ammPool', contractUrl],
    queryFn: () => fetchAmmPoolStatus(contractUrl),
    enabled: !!contractUrl,
    refetchInterval: 10000, // 增加到10秒，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
  });

  useEffect(() => {
    if (query.data) {
      setPool(contractUrl, toAmmPool(query.data));
    }
  }, [query.data, contractUrl, setPool]);

  return { pool, isLoading: query.isLoading || query.isFetching, refetch: query.refetch };
} 