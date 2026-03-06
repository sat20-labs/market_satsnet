import { useQuery } from '@tanstack/react-query';
import { contractService, type DaoContractStatus } from '@/domain/services/contract';
import { useCommonStore } from '@/store/common';

export function useDaoDetailData(contractUrl?: string) {
  const { network } = useCommonStore();

  const statusQuery = useQuery<DaoContractStatus | null>({
    queryKey: ['dao', 'status', contractUrl, network],
    enabled: !!contractUrl,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      if (!contractUrl) return null;
      try {
        const res = (await contractService.getContractStatus(contractUrl)) as any;
        if (!res) {
          console.warn('[dao] empty status for contractUrl:', contractUrl);
        }
        return res;
      } catch (e) {
        console.error('[dao] getContractStatus failed', { contractUrl, network }, e);
        throw e;
      }
    },
  });

  return {
    daoStatus: statusQuery.data ?? null,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    error: statusQuery.error,
    refresh: statusQuery.refetch,
  };
}
