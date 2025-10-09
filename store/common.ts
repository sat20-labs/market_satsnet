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
  // 服务暂停状态
  isServicePaused: boolean;
  servicePauseMessage: string;
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
  // 服务暂停相关方法
  setServicePaused: (paused: boolean, message?: string) => void;
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
        network: 'mainnet', // 默认值改为 mainnet
        btcHeight: 0,
        satsnetHeight: 0,
        runtimeEnv: 'dev',
        btcPrice: 0,
        appVersion: 0,
        signature: '',
        // 服务暂停状态初始值
        isServicePaused: false,
        servicePauseMessage: '服务暂时维护中，请稍后再试',
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
        setServicePaused: (paused, message) => {
          set({
            isServicePaused: paused,
            servicePauseMessage: message || '服务暂时维护中，请稍后再试',
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
              !['isServicePaused', 'servicePauseMessage'].includes(key),
            ),
          ),
      },
    ),
  ),
);


