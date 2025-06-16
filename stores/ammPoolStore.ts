import { create } from 'zustand';
import { AmmPool } from '@/domain/ammPool';

type AmmPoolMap = Record<string, AmmPool>;

interface AmmPoolState {
  pools: AmmPoolMap;
  setPool: (contractUrl: string, pool: AmmPool) => void;
  getPool: (contractUrl: string) => AmmPool | undefined;
}

export const useAmmPoolStore = create<AmmPoolState>((set, get) => ({
  pools: {},
  setPool: (contractUrl, pool) =>
    set((state) => ({
      pools: { ...state.pools, [contractUrl]: pool },
    })),
  getPool: (contractUrl) => get().pools[contractUrl],
})); 