import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import clientApi from '@/api/clientApi';
import { useCommonStore } from '@/store/common';

export const useHeight = () => {
  const { data, isLoading, isFetching, refetch } = useQuery<any, Error>({
    queryKey: ['getHeight'],
    queryFn: () => clientApi.getBestHeight(),
    refetchInterval: 10000, // 增加到10秒，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
  });
  const setSatsnetHeight = useCommonStore((s) => s.setSatsnetHeight);

  useEffect(() => {
    if (data?.data?.height) {
      setSatsnetHeight(data.data.height);
    }
  }, [data, setSatsnetHeight]);

  return { isLoading };
};  