import { useQuery } from '@tanstack/react-query';
import { clientApi } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useCommonStore } from '@/store/common';

export const useNsList = () => {
  const { address } = useReactWalletStore();
  const { network } = useCommonStore();
  return useQuery({
    queryKey: ['nsList', address],
    enabled: !!address,
    queryFn: async () => {
      const res = await fetch(`https://apiprd.sat20.org/${network === 'testnet' ? 'testnet4' : 'mainnet'}/ns/address/${address}`);
      const data = await res.json();
      return data.data;
    },
  });
};