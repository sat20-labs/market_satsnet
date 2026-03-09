import { useReactWalletStore } from '@sat20/btc-connect/dist/react';

const TESTNET_NETWORKS = new Set(['testnet', 'testnet4']);

/**
 * Tools 功能开关：
 * - 必须连接钱包
 * - 必须在测试网
 */
export function isToolsEnabled() {
  const { connected, address, network } = useReactWalletStore.getState() as any;
  return !!connected && !!address && TESTNET_NETWORKS.has(network);
}

export function useToolsEnabled() {
  return useReactWalletStore((s: any) => !!s.connected && !!s.address && TESTNET_NETWORKS.has(s.network));
}