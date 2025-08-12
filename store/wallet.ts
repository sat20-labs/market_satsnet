import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import clientApi from '@/api/clientApi';

interface Balance {
  availableAmt: number,
  lockedAmt: number
}
interface WalletState {
  balance: Balance;
  setBalance: (balance: Balance) => void;
  getBalance: () => Promise<void>;
}

export const useWalletStore = create<WalletState>()(
  devtools(
    persist(
      (set, get) => ({
        balance: {
          availableAmt: 0,
          lockedAmt: 0
        },
        setBalance: (balance: Balance) => {
          set({ balance });
        },
        getBalance: async () => {
          const { address } = useReactWalletStore.getState();
          if (!address) {
            return;
          }
          const amountResult = await window.sat20.getAssetAmount_SatsNet(address, '::')
          console.log('amountResult', amountResult)
          set({ balance: {
            availableAmt: amountResult.availableAmt,
            lockedAmt: amountResult.lockedAmt
          } });

        },
      }),
      {
        name: 'wallet-store',
        partialize: (state) =>
          Object.fromEntries(
            Object.entries(state).filter(([key]) =>
              ['balance'].includes(key),
            ),
          ),
      },
    ),
  ),
);


