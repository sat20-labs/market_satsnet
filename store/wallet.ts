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
          const { data } = await clientApi.getAddressSummary(address);
          console.log('data', data);
          const list = data?.map((item: any) => {
            const { Protocol, Type, Ticker } = item.Name;
            let key;
            if (Protocol === '' && Type === '') {
              key = '::'
            } else {
              key = `${Protocol}:${Type}:${Ticker}`;
            }
            return {
              key,
              ...item,
            };
          }) || [];
          console.log('list', list);
          const _v = list.find((item: any) => item.key === '::');
          if (_v) {
            set({ balance: {
              availableAmt: Number(_v.Amount),
              lockedAmt: 0,
            } });
          } else {
            set({ balance: {
              availableAmt: 0,
              lockedAmt: 0,
            } });
          }
          console.log('balance', get().balance);

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


