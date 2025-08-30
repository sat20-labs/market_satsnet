import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientApi } from '@/api';
import { parallel } from 'radash';
import { useAssetStore } from '@/store';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useState, useCallback } from 'react';
import type { AssetItem, AssetUtxoItem } from '@/store/asset';

/**
 * 刷新选项接口
 */
export interface RefreshOptions {
  resetState?: boolean;
  refreshSummary?: boolean;
  clearCache?: boolean;
}

/**
 * 处理单个资产的UTXO数据
 */
const processAssetUtxo = async (
  address: string,
  key: string,
  start = 0,
  limit = 100,
): Promise<AssetUtxoItem[]> => {
  const result = await clientApi.getOrdxAddressHolders(address, key, start, limit);
  return result?.data || [];
};

/**
 * 并行处理多个资产的UTXO数据
 */
const processAllUtxos = async (
  address: string,
  tickers: string[],
): Promise<AssetUtxoItem[][]> => {
  if (!tickers.length) return [];
  return await parallel(3, tickers, (ticker) =>
    processAssetUtxo(address, ticker, 0, 100)
  );
};

/**
 * 资产钩子 - 用于获取和管理用户的资产数据
 */
export const useAssets = () => {
  const {
    rawAssetList,
    setRawAssetList,
    updateAssetsByProtocol,
    setPlainUtxos,
    setAvailableAssetTypes,
  } = useAssetStore();
  
  const { address, network } = useReactWalletStore();
  const queryClient = useQueryClient();

  // 错误状态
  const [error, setError] = useState<Error | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery<any, Error>({
    queryKey: ['getAddressSummary', address],
    queryFn: () => clientApi.getAddressSummary(address),
    enabled: !!address,
    refetchInterval: 15000, // 增加到15秒，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
  });

  /**
   * 解析资产摘要数据并更新状态
   */
  const parseAssetSummary = useCallback(async () => {
    if (!data) return;

    try {
      const assets = data?.data || [];
      const newAssetList: AssetItem[] = [];
      console.log('assets', assets);
      
      assets.forEach((item: any) => {
        const key = item.Name.Protocol
          ? `${item.Name.Protocol}:${item.Name.Type}:${item.Name.Ticker}`
          : '::';

        if (!rawAssetList.find((v) => v?.key === key)) {
          newAssetList.push({
            id: key,
            key,
            protocol: item.Name.Protocol,
            type: item.Name.Type,
            label: item.Name.Type === 'e'
              ? `${item.Name.Ticker}（raresats）`
              : item.Name.Ticker,
            ticker: item.Name.Ticker,
            utxos: [],
            amount: item.Amount,
          });
        }
      });

      if (newAssetList.length > 0) {
        setRawAssetList([...rawAssetList, ...newAssetList]);
      }

      // 更新各类资产列表
      const protocols = ['ordx', 'runes', 'brc20', 'ord', ''];
      protocols.forEach(protocol => {
        const filteredAssets = newAssetList.filter(item => item.protocol === protocol);
        if (filteredAssets.length > 0) {
          const protocolKey = protocol || 'plain';
          updateAssetsByProtocol(protocolKey, filteredAssets);
        }
      });

      // 更新可用资产类型
      const uniqueTypes = [
        ...(newAssetList.some(item => !item.protocol) ? [{ label: 'BTC', value: 'btc' }] : []),
        ...(newAssetList.some(item => item.protocol === 'ordx') ? [{ label: 'SAT20', value: 'ordx' }] : []),
        ...(newAssetList.some(item => item.protocol === 'runes') ? [{ label: 'Runes', value: 'runes' }] : []),
      ];
      setAvailableAssetTypes(uniqueTypes);

      return newAssetList;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to parse asset summary'));
      throw err;
    }
  }, [data, rawAssetList, setRawAssetList, updateAssetsByProtocol, setAvailableAssetTypes]);

  /**
   * 加载资产摘要数据
   */
  const loadSummaryData = useCallback(async () => {
    try {
      const result = await refetch();
      if (result.data) {
        await parseAssetSummary();
        return result.data;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load summary data'));
      return null;
    }
  }, [refetch, parseAssetSummary]);

  /**
   * 加载资产的UTXO数据
   */
  const loadUtxoData = useCallback(async (assetKeys?: string[]) => {
    try {
      const keys = assetKeys || rawAssetList.map(item => item.key);
      const utxos = await processAllUtxos(address, keys);
      
      // 更新 UTXO 数据
      const plainAssets = rawAssetList.filter(item => !item.protocol);
      if (plainAssets.length > 0) {
        setPlainUtxos(plainAssets[0]?.utxos || []);
      }
      
      return utxos;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load UTXO data'));
      return [];
    }
  }, [address, rawAssetList, setPlainUtxos]);

  /**
   * 刷新资产数据
   */
  const refreshAssets = useCallback(async (options: RefreshOptions = {}) => {
    const {
      resetState = true,
      refreshSummary = true,
      clearCache = true,
    } = options;

    try {
      if (clearCache && refreshSummary) {
        queryClient.invalidateQueries({
          queryKey: ['summary', address, network],
        });
      }

      if (resetState) {
        setRawAssetList([]);
      }

      if (refreshSummary) {
        await loadSummaryData();
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh assets'));
      return false;
    }
  }, [address, network, queryClient, loadSummaryData, setRawAssetList]);

  return {
    // 状态
    loading: isLoading || isFetching,
    error,
    isSummaryLoading: isLoading || isFetching,
    summaryData: data,
    assetList: rawAssetList,

    // 方法
    loadSummaryData,
    loadUtxoData,
    refreshAssets,
    clearError: () => setError(null),
  };
};
