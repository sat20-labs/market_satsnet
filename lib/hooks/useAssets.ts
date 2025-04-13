import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientApi } from '@/api';
import { parallel } from 'radash';
import { useAssetStore, useCommonStore } from '@/store';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useState, useMemo, useEffect, useCallback } from 'react';

/**
 * UTXO 项目接口定义
 */
export interface UtxoItem {
  Outpoint: string;
  Value: number;
  Assets: {
    Name: {
      Protocol: string;
      Type: string;
      Ticker: string;
    };
    Amount: string;
    BindingSat: number;
    Offsets: {
      Start: number;
      End: number;
    }[];
  }[];
}

/**
 * 资产项目接口定义
 */
export interface AssetItem {
  id: string;
  key: string;
  protocol: string;
  type: string;
  label: string;
  ticker: string;
  utxos: UtxoItem[];
  amount: number;
}

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
export const processAssetUtxo = async (
  address: string,
  key: string,
  start = 0,
  limit = 100,
  updateAssetList: (updater: (prevList: AssetItem[]) => AssetItem[]) => void,
  onError?: (error: Error) => void
) => {
  try {
    const result = await clientApi.getOrdxAddressHolders(address, key, start, limit);

    if (result?.data?.length) {
      updateAssetList(prevList => {
        const newList = [...prevList];
        const findItemIndex = newList.findIndex((a) => a.key === key);
        if (findItemIndex >= 0 && result.data) {
          newList[findItemIndex] = {
            ...newList[findItemIndex],
            utxos: result.data
          };
        }
        return newList;
      });
    }
    return result?.data || [];
  } catch (err) {
    const error = err instanceof Error ? err : new Error(`Failed to process asset UTXO for ${key}`);
    if (onError) onError(error);
    throw error;
  }
};

/**
 * 并行处理多个资产的UTXO数据
 */
export const processAllUtxos = async (
  address: string,
  tickers: string[],
  updateAssetList: (updater: (prevList: AssetItem[]) => AssetItem[]) => void,
  onError?: (error: Error) => void
) => {
  if (!tickers.length) return [];
  try {
    const results = await parallel(3, tickers, (ticker) =>
      processAssetUtxo(address, ticker, 0, 100, updateAssetList, onError)
    );
    return results;
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to process all UTXOs');
    if (onError) onError(error);
    throw error;
  }
};

/**
 * 资产钩子 - 用于获取和管理用户的资产数据
 */
export const useAssets = () => {
  const assetsStore = useAssetStore();
  const { chain } = useCommonStore();
  const { address, network } = useReactWalletStore();
  const queryClient = useQueryClient();

  // 资产列表状态
  const [allAssetList, setAllAssetList] = useState<AssetItem[]>([]);
  // 错误状态
  const [error, setError] = useState<Error | null>(null);

  // 资产摘要查询 - 默认不自动请求
  const summaryQuery = useQuery({
    queryKey: ['summary', chain, address, network],
    queryFn: async () => {
      try {
        return await clientApi.getAddressSummary(address);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch summary data'));
        throw err;
      }
    },
    enabled: false, // 默认不自动请求
  });

  /**
   * 解析资产摘要数据并更新状态
   */
  const parseAssetSummary = useCallback(async () => {
    if (!summaryQuery.data) return;

    try {
      const assets = summaryQuery.data?.data || [];
      const newAssetList: AssetItem[] = [];

      assets.forEach((item: any) => {
        const key = item.Name.Protocol
          ? `${item.Name.Protocol}:${item.Name.Type}:${item.Name.Ticker}`
          : '::';

        if (!allAssetList.find((v) => v?.key === key)) {
          newAssetList.push({
            id: key,
            key,
            protocol: item.Name.Protocol,
            type: item.Name.Type,
            label:
              item.Name.Type === 'e'
                ? `${item.Name.Ticker}（raresats）`
                : item.Name.Ticker,
            ticker: item.Name.Ticker,
            utxos: [],
            amount: item.Amount,
          });
        }
      });

      if (newAssetList.length > 0) {
        setAllAssetList(prev => [...prev, ...newAssetList]);
      }
      return newAssetList;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to parse asset summary'));
      throw err;
    }
  }, [summaryQuery.data, allAssetList]);

  /**
   * 更新资产存储
   */
  const updateStoreAssets = useCallback((list: AssetItem[]) => {
    try {
      // 按协议类型过滤资产并更新存储
      assetsStore.setSat20List(list.filter((item) => item?.protocol === 'ordx'));
      assetsStore.setRunesList(list.filter((item) => item?.protocol === 'runes'));
      assetsStore.setBrc20List(list.filter((item) => item?.protocol === 'brc20'));
      assetsStore.setOrdList(list.filter((item) => item?.protocol === 'ord'));

      // 处理普通BTC资产
      const plain = list.filter((item) => item?.protocol === '');
      assetsStore.setPlainList(plain);
      assetsStore.setPlainUtxos(plain?.[0]?.utxos || []);

      // 构建唯一资产类型列表
      const uniqueTypes = [
        ...(plain?.length ? [{ label: 'Btc', value: 'btc' }] : []),
        ...(list.some((item) => item?.protocol === 'ordx')
          ? [{ label: 'SAT20', value: 'ordx' }]
          : []),
        ...(list.some((item) => item?.protocol === 'runes')
          ? [{ label: 'Runes', value: 'runes' }]
          : []),
      ];
      assetsStore.setUniqueAssetList(uniqueTypes);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update asset store'));
    }
  }, [assetsStore]);

  // 当资产列表更新时，更新存储
  useEffect(() => {
    updateStoreAssets(allAssetList);
  }, [allAssetList, updateStoreAssets]);

  /**
   * 加载资产摘要数据
   */
  const loadSummaryData = useCallback(async () => {
    try {
      const result = await summaryQuery.refetch();
      if (result.data) {
        // 更新原始资产列表
        assetsStore.setAssetList(result.data?.data || []);
        // 解析摘要数据
        await parseAssetSummary();
        return result.data;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load summary data'));
      return null;
    }
  }, [summaryQuery, assetsStore, parseAssetSummary]);

  /**
   * 加载资产的UTXO数据
   */
  const loadUtxoData = useCallback(async (assetKeys?: string[]) => {
    try {
      const keys = assetKeys || allAssetList.map(item => item.key);
      return await processAllUtxos(address, keys, setAllAssetList, setError);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load UTXO data'));
      return [];
    }
  }, [address, allAssetList]);

  /**
   * 刷新资产数据
   * @param {RefreshOptions} options - 刷新选项
   */
  const refreshAssets = useCallback(async (options: RefreshOptions = {}) => {
    const {
      resetState = true,
      refreshSummary = true,
      clearCache = true,
    } = options;

    try {
      // 清除缓存
      if (clearCache && refreshSummary) {
        queryClient.invalidateQueries({
          queryKey: ['summary', chain, address, network],
        });
      }

      // 重置状态
      if (resetState) {
        setAllAssetList([]);
      }

      // 刷新摘要数据
      if (refreshSummary) {
        await loadSummaryData();
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh assets'));
      return false;
    }
  }, [address, chain, network, queryClient, loadSummaryData]);

  // 计算加载状态
  const loading = useMemo(
    () => summaryQuery.isLoading,
    [summaryQuery.isLoading]
  );

  // 返回钩子数据和方法
  return {
    // 状态
    loading,
    error,
    isSummaryLoading: summaryQuery.isLoading,
    summaryData: summaryQuery.data,
    assetList: allAssetList,

    // 方法
    loadSummaryData,
    loadUtxoData,
    refreshAssets,
    clearError: () => setError(null),
    updateAssetList: setAllAssetList,
  };
};
