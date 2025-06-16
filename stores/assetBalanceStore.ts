import { create } from 'zustand';

export type AssetBalance = { availableAmt: number; lockedAmt: number };
export type AssetBalanceMap = Record<string, AssetBalance>;

interface AssetBalanceState {
  balances: AssetBalanceMap;
  setBalance: (assetName: string, balance: AssetBalance) => void;
  getBalance: (assetName: string) => AssetBalance;
  reset: () => void;
}

export const useAssetBalanceStore = create<AssetBalanceState>((set, get) => ({
  balances: {},
  setBalance: (assetName, balance) =>
    set((state) => ({
      balances: { ...state.balances, [assetName]: balance },
    })),
  getBalance: (assetName) => get().balances[assetName] || { availableAmt: 0, lockedAmt: 0 },
  reset: () => set({ balances: {} }),
})); 