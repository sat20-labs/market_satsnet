import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import clientApi from '@/api/clientApi';
import { useCommonStore } from '@/store/common';
import { useUtxoStore, UtxoItem } from '@/store/utxo';
// TODO: Consider renaming this hook to reflect its purpose (e.g., useOrdxHolders)

// Define the type for the API response item based on the example
interface OrdxHolderItem {
  Assets: any; // Adjust type if known
  Outpoint: string; // "txid:vout"
  PkScript: string;
  UtxoId: number; // Or string, based on actual API
  Value: number;
}

export const usePlainUtxo = (start: number = 0, limit: number = 100) => {
  const queryClient = useQueryClient();
  const { address } = useReactWalletStore((state) => state);
  const { chain } = useCommonStore((state) => state);
  // Get the setList function from the Utxo store
  const { setList } = useUtxoStore((state) => ({ setList: state.setList }));
  const queryKeyFixed = '::'; // Fixed key as requested
  console.log('address', address);

  // Define the base query key (without pagination) for invalidation
  const baseQueryKey = ['ordxHolders', address, queryKeyFixed, chain];
  // Define the specific query key for fetching the current page
  const specificQueryKey = [...baseQueryKey, start, limit];

  const queryResult = useQuery<OrdxHolderItem[] | null>({
    queryKey: specificQueryKey,
    queryFn: async () => {
      if (!address) {
        return null;
      }
      console.log('Fetching ordx holders:', {
        address,
        queryKey: queryKeyFixed,
        start,
        limit,
        chain,
      });
      const result = await clientApi.getOrdxAddressHolders(
        address,
        queryKeyFixed,
        start,
        limit,
      );
      console.log('API result:', result);
      return Array.isArray(result?.data) ? result.data : [];
    },
    enabled: !!address,
  });

  // Effect to update the store when query data changes
  console.log('Fetched data, updating Utxo store:', queryResult.data, queryResult.isSuccess);
  useEffect(() => {
    if (queryResult.isSuccess && queryResult.data) {
      const transformedList: UtxoItem[] = queryResult.data
        .filter(item => {
          const [txid, voutStr] = item.Outpoint.split(':');
          return txid && !isNaN(parseInt(voutStr, 10));
        })
        .map(item => {
          const [txid, voutStr] = item.Outpoint.split(':');
          const vout = parseInt(voutStr, 10);
          return {
            txid,
            vout,
            value: item.Value,
            utxo: item.Outpoint,
            status: 'unspend' as const,
            location: 'remote' as const,
            sort: 0,
          };
        });

      console.log('Updating Utxo store with:', transformedList);
      setList(transformedList);
    }
  }, [queryResult.isSuccess, queryResult.data, setList]);

  // 2. Create the invalidation function using useCallback
  const invalidateAndRefetch = useCallback(async () => {
    if (!address) {
      console.warn("Cannot refetch ordx holders: address is not available.");
      return;
    }
    console.log('Invalidating ordxHolders query with base key:', baseQueryKey);
    // Invalidate all queries matching the base key
    // This will mark them as stale and trigger a refetch for active queries
    await queryClient.invalidateQueries({ queryKey: baseQueryKey });
    // Optional: You might force an immediate refetch of the current page if needed
    // await queryClient.refetchQueries({ queryKey: specificQueryKey });
  }, [queryClient, baseQueryKey, address]);

  // 3. Return the query result and the new function
  return { ...queryResult, invalidateAndRefetch };
};
