import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { ordx } from './ordx';
const useSatTypes = ({ network }: any) => {
  const { data, error, isLoading } = useSWR(
    `ordx-utxo-satstype-${network}`,
    () => ordx.getSatTypes({ network }),
    {
      keepPreviousData: true,
    },
  );
  return {
    data,
    error,
    isLoading: isLoading,
  };
};

export const useOrdxInfo = ({ tick, network }: any) => {
  const { data, error, isMutating, trigger, reset } = useSWRMutation(
    `ord2-info-${tick}-${network}`,
    () => ordx.getOrdxInfo({ tick, network }),
  );
  return {
    data,
    trigger,
    reset,
    error,
    isLoading: isMutating,
  };
};
export const useNsListStatus = ({ tick, network }: any) => {
  const { data, error, isLoading } = useSWR(
    `ord2-info-${tick}-${network}`,
    () => ordx.getNsListStatus({ tick, network }),
  );
  return {
    data,
    error,
    isLoading,
  };
};

export const useBtcHeight = (network: string) => {
  const { data, error, isLoading } = useSWR(
    `height-${network}`,
    () => ordx.getBestHeight({ network }),
    {
      refreshInterval: 1000 * 60 * 5,
    },
  );
  return {
    data,
    error,
    isLoading,
  };
};

export const ordxSWR = {
  useSatTypes,
  useBtcHeight,
  useOrdxInfo,
  useNsListStatus,
};
