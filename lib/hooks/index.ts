export * from './useAssets';
import { useCommonStore } from '@/store';
import { useMemo } from 'react';
export * from './usePlainUtxo';
import { Decimal } from 'decimal.js';

export const useBtcPrice = (btc: string | number) => {
  const { btcPrice } = useCommonStore();
  const btcUsd = useMemo(() => {
    // Guard against undefined/null/empty inputs and non-finite results
    if (btc === undefined || btc === null || (btc as any) === '') return '0.00';
    try {
      const a = new Decimal(btc);
      const b = new Decimal(btcPrice || 0);
      const val = a.mul(b);
      if (!val.isFinite()) return '0.00';
      return val.toFixed(2);
    } catch {
      return '0.00';
    }
  }, [btc, btcPrice]);
  return btcUsd;
};
