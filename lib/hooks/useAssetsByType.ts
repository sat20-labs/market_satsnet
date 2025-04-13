import { useMemo, useState, useCallback, useEffect } from 'react';
import { useAssets } from './useAssets';
import { useAssetStore } from '@/store';

/**
 * 按类型过滤资产的钩子
 *
 * 这个钩子构建在 useAssets 之上，提供按协议类型过滤的功能
 *
 * @param {string} protocolType - 要过滤的协议类型 ('ordx', 'runes', 'brc20', 'ord', 'btc')
 * @param {boolean} autoLoad - 是否自动加载数据，默认为 false
 */
export const useAssetsByType = (protocolType: string = '', autoLoad: boolean = false) => {
  const {
    loading,
    error,
    assetList,
    loadSummaryData,
    loadUtxoData,
    refreshAssets: refreshAllAssets,
    clearError
  } = useAssets();

  const assetStore = useAssetStore();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 根据协议类型获取对应的资产列表
  const filteredAssets = useMemo(() => {
    if (protocolType === 'btc') {
      return assetStore.plainList;
    }

    return assetList.filter(asset => {
      if (protocolType === '') return true;
      return asset.protocol === protocolType;
    });
  }, [assetList, protocolType, assetStore.plainList]);

  // 获取选中资产的详细信息
  const selectedAssetDetails = useMemo(() => {
    if (!selectedAsset) return null;
    return filteredAssets.find(asset => asset.key === selectedAsset) || null;
  }, [selectedAsset, filteredAssets]);

  // 加载资产数据
  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      // 加载摘要数据
      const summaryData = await loadSummaryData();

      // 如果有摘要数据，加载特定类型的UTXO数据
      if (summaryData) {
        // 过滤出特定类型的资产键
        const keys = assetList
          .filter(asset => {
            if (protocolType === '') return true;
            if (protocolType === 'btc') return asset.protocol === '';
            return asset.protocol === protocolType;
          })
          .map(asset => asset.key);

        // 加载这些资产的UTXO数据
        if (keys.length > 0) {
          await loadUtxoData(keys);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to load assets by type:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadSummaryData, loadUtxoData, assetList, protocolType]);

  // 刷新特定类型的资产
  const refreshAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      // 先刷新所有资产数据
      await refreshAllAssets({
        resetState: false, // 不重置所有状态，只刷新数据
        refreshSummary: true, // 总是刷新摘要
        clearCache: true
      });

      // 然后加载特定类型的UTXO数据
      const keys = assetList
        .filter(asset => {
          if (protocolType === '') return true;
          if (protocolType === 'btc') return asset.protocol === '';
          return asset.protocol === protocolType;
        })
        .map(asset => asset.key);

      if (keys.length > 0) {
        await loadUtxoData(keys);
      }

      return true;
    } catch (error) {
      console.error('Failed to refresh assets by type:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllAssets, loadUtxoData, assetList, protocolType]);

  // 如果设置了自动加载，则在组件挂载时加载数据
  useEffect(() => {
    if (autoLoad) {
      loadAssets();
    }
  }, [autoLoad, loadAssets]);

  return {
    loading: loading || isLoading,
    error,
    assets: filteredAssets,
    selectedAsset: selectedAssetDetails,
    setSelectedAsset,
    loadAssets,
    refreshAssets,
    clearError
  };
};
