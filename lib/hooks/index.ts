export * from './useAssets';
import { useCommonStore } from '@/store';
import { useMemo } from 'react';
export * from './usePlainUtxo';
import { Decimal } from 'decimal.js';

export const useBtcPrice = (btc: string | number) => {
  const { btcPrice } = useCommonStore();
  const btcUsd = useMemo(() => {
    const a = new Decimal(btc);
    const b = new Decimal(btcPrice);
    return a.mul(b).toFixed(2);
  }, [btc, btcPrice]);
  return btcUsd;
};
