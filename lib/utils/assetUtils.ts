import { clientApi } from '@/api';
import { parallel } from 'radash';
import { AssetItem, UtxoItem } from '@/lib/hooks/useAssets';

/**
 * 处理单个资产的UTXO数据
 * 
 * @param address 用户地址
 * @param key 资产键
 * @param start 起始位置
 * @param limit 限制数量
 * @returns UTXO数据
 */
export const fetchAssetUtxo = async (
  address: string,
  key: string,
  start = 0,
  limit = 100
): Promise<UtxoItem[]> => {
  try {
    const result = await clientApi.getOrdxAddressHolders(address, key, start, limit);
    return result?.data || [];
  } catch (err) {
    console.error(`Failed to fetch UTXO for asset ${key}:`, err);
    throw err;
  }
};

/**
 * 并行处理多个资产的UTXO数据
 * 
 * @param address 用户地址
 * @param tickers 资产键数组
 * @param concurrency 并发数
 * @returns 所有UTXO数据
 */
export const fetchAllUtxos = async (
  address: string,
  tickers: string[],
  concurrency = 3
): Promise<Record<string, UtxoItem[]>> => {
  if (!tickers.length) return {};
  
  try {
    const results = await parallel(concurrency, tickers, async (ticker) => {
      const utxos = await fetchAssetUtxo(address, ticker);
      return { ticker, utxos };
    });
    
    // 将结果转换为 { ticker: utxos } 格式
    return results.reduce((acc, { ticker, utxos }) => {
      acc[ticker] = utxos;
      return acc;
    }, {} as Record<string, UtxoItem[]>);
  } catch (err) {
    console.error('Failed to fetch all UTXOs:', err);
    throw err;
  }
};

/**
 * 更新资产列表中的UTXO数据
 * 
 * @param assetList 资产列表
 * @param utxoMap UTXO数据映射
 * @returns 更新后的资产列表
 */
export const updateAssetsWithUtxos = (
  assetList: AssetItem[],
  utxoMap: Record<string, UtxoItem[]>
): AssetItem[] => {
  return assetList.map(asset => {
    const utxos = utxoMap[asset.key];
    if (utxos) {
      return {
        ...asset,
        utxos
      };
    }
    return asset;
  });
};

/**
 * 按协议类型过滤资产
 * 
 * @param assetList 资产列表
 * @param protocolType 协议类型
 * @returns 过滤后的资产列表
 */
export const filterAssetsByType = (
  assetList: AssetItem[],
  protocolType: string
): AssetItem[] => {
  if (!protocolType) return assetList;
  
  return assetList.filter(asset => {
    if (protocolType === 'btc') return asset.protocol === '';
    return asset.protocol === protocolType;
  });
};

/**
 * 获取资产的总价值
 * 
 * @param asset 资产
 * @returns 总价值
 */
export const getAssetTotalValue = (asset: AssetItem): number => {
  return asset.utxos.reduce((total, utxo) => total + utxo.Value, 0);
};

/**
 * 获取资产的总数量
 * 
 * @param asset 资产
 * @returns 总数量
 */
export const getAssetTotalAmount = (asset: AssetItem): number => {
  return Number(asset.amount) || 0;
};
