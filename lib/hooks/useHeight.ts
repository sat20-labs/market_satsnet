import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import clientApi from '@/api/clientApi';
import { useCommonStore } from '@/store/common';

export const useHeight = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['bestHeight'],
    queryFn: clientApi.getBestHeight,
    refetchInterval: 2000,
  });
  const setSatsnetHeight = useCommonStore((s) => s.setSatsnetHeight);

  useEffect(() => {
    if (data?.data?.height) {
      setSatsnetHeight(data.data.height);
    }
  }, [data, setSatsnetHeight]);

  return { isLoading };
};  