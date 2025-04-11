import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface BuyUtxoAssetItem {
  utxo: string;
  value: number;
  price: string;
  status: 'pending' | 'confirmed' | 'failed';
  raw: string;
  tickers: {
    ticker: string;
    amount: number;
    inscriptionnum: number;
  }[];
}

interface BuyState {
  list: any[];
  add: (item: any) => void;
  setList: (list: any[]) => void;
  changeStatus: (
    utxo: string,
    status: 'pending' | 'confirmed' | 'failed',
  ) => void;
  changePrice: (utxo: string, price: string) => void;
  remove: (utxo: string) => void;
  reset: () => void;
}

export const useBuyStore = create<BuyState>()(
  devtools((set, get) => ({
    list: [
      // {
      //   price: '0.00032',
      //   order_id: '1234567890',
      //   raw: '70736274ff01005e02000000010cc06bfce26bd8fa84e893c327805f5c80f830edb7f27558307254eb4b1e75c10000000000ffffffff01ac080000000000002251205971a7e6b181b0cb407ee8cc50330293dc580259ffeda320b8bb94da059ee9ab000000000001012b22020000000000002251205971a7e6b181b0cb407ee8cc50330293dc580259ffeda320b8bb94da059ee9ab0108430141cc6a928aa68e6af6b924d8fa7467621554d05a6aba068d3edf1d2a3ef95b14be44dd3fbbe9f8272edc7532613142640d652bda8ac132c89519215bc7b29d3a9d830000',
      //   assets: [
      //     {
      //       ticker: '1231',
      //     },
      //   ],
      // },
    ],
    setList: (list) => {
      set({
        list,
      });
    },
    changePrice(utxo, price) {
      const { list } = get();
      const newList = list.map((item) => {
        if (item.utxo === utxo) {
          return {
            ...item,
            price,
          };
        }
        return item;
      });

      set({
        list: newList,
      });
    },

    changeStatus(utxo, status) {
      const { list } = get();
      const newList = list.map((item) => {
        if (item.utxo === utxo) {
          return {
            ...item,
            status,
          };
        }
        return item;
      });

      set({
        list: newList,
      });
    },
    add: (item) => {
      const { list } = get();
      if (!list.find((i) => i.utxo === item.utxo) && list.length < 32) {
        set((state) => {
          return {
            list: [...state.list, item],
          };
        });
      }
    },
    remove: (utxo) => {
      set((state) => {
        return {
          list: state.list.filter((item) => item.utxo !== utxo),
        };
      });
    },
    reset: () => {
      set({
        list: [],
      });
    },
  })),
);
