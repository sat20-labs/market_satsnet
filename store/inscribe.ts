import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface InscribeState {
  inscribeData: any;
  setData: (data: any) => void;
  reset: () => void;
}

export const useInscribeStore = create<InscribeState>()(
  devtools((set) => ({
    inscribeData: {},
    setData: (data) => set(() => ({ inscribeData: data })),
    reset: () => {
      set({
        inscribeData: {},
      });
    },
  })),
);
