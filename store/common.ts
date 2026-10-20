import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type Chain = 'Bitcoin' | 'SatoshiNet';
export type Network = 'mainnet' | 'testnet' | 'regtest';

export const getNetworkFromUrl = (): Network | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const value = new URLSearchParams(window.location.search).get('network');
  return value === 'mainnet' || value === 'testnet' || value === 'regtest' ? value : undefined;
};

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
        network: process.env.NEXT_PUBLIC_NETWORK === 'regtest' ? 'regtest' : 'mainnet',
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
            network: process.env.NEXT_PUBLIC_NETWORK === 'regtest' ? 'regtest' : network,
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
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<CommonState>;
          const urlNetwork = getNetworkFromUrl();
          return {
            ...currentState,
            ...persisted,
            network: process.env.NEXT_PUBLIC_NETWORK === 'regtest' ? 'regtest' : urlNetwork ?? persisted.network ?? currentState.network,
          };
        },
      },
    ),
  ),
);

const readPersistedNetwork = (): Network | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const raw = window.localStorage.getItem('common-store');
    if (!raw) return undefined;

    const persisted = JSON.parse(raw);
    const network = persisted?.state?.network;
    return network === 'mainnet' || network === 'testnet' || network === 'regtest' ? network : undefined;
  } catch {
    return undefined;
  }
};

// Resolve the network before the persisted Zustand state has finished hydrating.
// An explicit URL network is used for embedded PWA pages; otherwise use the
// locally persisted Market setting before falling back to the in-memory store.
export const getConfiguredNetwork = (): Network => {
  if (process.env.NEXT_PUBLIC_NETWORK === 'regtest') return 'regtest';
  return getNetworkFromUrl()
    ?? readPersistedNetwork()
    ?? useCommonStore.getState().network;
};
