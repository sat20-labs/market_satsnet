import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type Chain = 'Bitcoin' | 'SatoshiNet';
export type Network = 'MainNet' | 'TestNet';

interface CommonState {
  feeRate: {
    value: number;
    type?: string;
  };
  chain: Chain;
  network: Network; // 将 network 类型改为 Network
  btcHeight: number;
  btcPrice: number;
  appVersion: number;
  signature?: string;
  runtimeEnv: string;
  changeNetwork: (network: Network) => void; // 修改参数类型为 Network
  setChain: (chain: Chain) => void;
  setAppVersion: (version: number) => void;
  setEnv: (env: string) => void;
  setBtcPrice: (b: number) => void;
  setHeight: (h: number) => void;
  setSignature: (signature: string) => void;
  setFeeRate: (feeRate: any) => void;
  reset: () => void;
}

export const useCommonStore = create<CommonState>()(
  devtools(
    persist(
      (set) => ({
        feeRate: {
          value: 1,
          type: 'custom',
        },
        chain: 'Bitcoin',
        network: 'MainNet', // 默认值改为 MainNet
        btcHeight: 0,
        runtimeEnv: 'dev',
        btcPrice: 0,
        appVersion: 0,
        signature: '',
        setEnv: (env) => {
          set({
            runtimeEnv: env,
          });
        },
        setChain: (chain) => {
          set({
            chain,
          });
        },
        changeNetwork: (network) => {
          set({
            network,
          });
        },
        setAppVersion: (version) => {
          set({
            appVersion: version,
          });
        },
        setSignature: (signature) => {
          set({
            signature,
          });
        },
        setFeeRate: (rate) => {
          set({
            feeRate: rate,
          });
        },
        setBtcPrice: (b) => {
          set({
            btcPrice: b,
          });
        },
        setHeight: (height) => {
          set({
            btcHeight: height,
          });
        },
        reset: () => {
          set({
            btcHeight: 0,
            feeRate: {
              value: 1,
              type: 'custom',
            },
            appVersion: 0,
          });
        },
      }),
      {
        name: 'common-store',
        partialize: (state) =>
          Object.fromEntries(
            Object.entries(state).filter(([key]) =>
              ['signature'].includes(key),
            ),
          ),
      },
    ),
  ),
);


