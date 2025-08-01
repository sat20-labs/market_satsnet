import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type Chain = 'Bitcoin' | 'SatoshiNet';
export type Network = 'mainnet' | 'testnet';

interface CommonState {
  feeRate: {
    value: number;
    type?: string;
  };
  btcFeeRate: {
    value: number;
    type?: string;
  };
  chain: Chain;
  network: Network; // 将 network 类型改为 Network
  btcHeight: number;
  satsnetHeight: number;
  btcPrice: number;
  appVersion: number;
  signature?: string;
  runtimeEnv: string;
  setNetwork: (network: Network) => void; // 修改参数类型为 Network
  setChain: (chain: Chain) => void;
  setAppVersion: (version: number) => void;
  setEnv: (env: string) => void;
  setBtcPrice: (b: number) => void;
  setHeight: (h: number) => void;
  setSatsnetHeight: (h: number) => void;
  setSignature: (signature: string) => void;
  setFeeRate: (feeRate: any) => void;
  setBtcFeeRate: (btcFeeRate: any) => void;
  reset: () => void;
}

export const useCommonStore = create<CommonState>()(
  devtools(
    persist(
      (set) => ({
        feeRate: {
          value: 10,
          type: 'custom',
        },
        btcFeeRate: {
          value: 1,
          type: 'custom',
        },
        chain: 'SatoshiNet',
        network: 'testnet', // 默认值改为 mainnet
        btcHeight: 0,
        satsnetHeight: 0,
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
        setNetwork: (network) => {
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
        setBtcFeeRate: (rate) => {
          set({
            btcFeeRate: rate,
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
        setSatsnetHeight: (height) => {
          set({
            satsnetHeight: height,
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


