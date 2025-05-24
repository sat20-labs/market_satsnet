import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ContractState {
  supportedContracts: string[];
  setSupportedContracts: (contracts: string[]) => void;
}

export const useContractStore = create<ContractState>()(
  devtools(
    persist(
      (set) => ({
        supportedContracts: [],
        setSupportedContracts: (contracts) => {
          set({
            supportedContracts: contracts,
          });
        },

      }),
      {
        name: 'contract-store',
      },
    ),
  ),
);


