import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientApi } from '@/api';
import { parallel } from 'radash';
import { useAssetStore, useCommonStore } from '@/store';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useState, useMemo, useEffect } from 'react';

interface UtxoItem {
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

interface AssetItem {
  id: string;
  key: string;
  protocol: string;
  type: string;
  label: string;
  ticker: string;
  utxos: UtxoItem[];
  amount: number;
}

// 定义刷新选项接口
interface RefreshOptions {
  resetState?: boolean;
  refreshNs?: boolean;
  refreshSummary?: boolean;
  refreshUtxos?: boolean;
  clearCache?: boolean;
}

export const useAssets = () => {
  const assetsStore = useAssetStore();
  const { chain } = useCommonStore();
  const { address, network } = useReactWalletStore();
  const queryClient = useQueryClient();

  // 将 ref 转换为 useState
  const [allAssetList, setAllAssetList] = useState<AssetItem[]>([]);

  // 将 computed 转换为 useMemo

  const nsQuery = useQuery({
    queryKey: ['ns', chain, address, network],
    queryFn: () =>
      clientApi.getNsListByAddress(address),
    enabled: !!address && !!network,
  });

  const summaryQuery = useQuery({
    queryKey: ['summary', chain, address, network],
    queryFn: () =>
      clientApi.getAddressSummary(address),
    enabled: !!address && !!network,
  });

  // Asset Processing Functions
  const processAssetUtxo = async (key: string, start = 0, limit = 100) => {
    const result = await clientApi.getOrdxAddressHolders(address, key, start, limit);

    if (result?.data?.length) {
      setAllAssetList(prevList => {
        const newList = [...prevList];
        console.log('result.data', result.data);
        const findItemIndex = newList.findIndex((a) => a.key === key);
        if (findItemIndex > 0 && result.data) {
          newList[findItemIndex] = {
            ...newList[findItemIndex],
            utxos: result.data
          };
        }
        return newList;
      });
    }
  };

  const processAllUtxos = async (tickers: string[]) => {
    if (!tickers.length) return;
    await parallel(3, tickers, (ticker) => processAssetUtxo(ticker));
  };

  const parseAssetSummary = async () => {
    console.log('summaryQuery.data', summaryQuery.data);

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
  };

  // Store Updates
  const updateStoreAssets = (list: AssetItem[]) => {
    assetsStore.setSat20List(list.filter((item) => item?.protocol === 'ordx'));
    assetsStore.setRunesList(list.filter((item) => item?.protocol === 'runes'));
    assetsStore.setBrc20List(list.filter((item) => item?.protocol === 'brc20'));
    assetsStore.setOrdList(list.filter((item) => item?.protocol === 'ord'));

    const plain = list.filter((item) => item?.protocol === '');
    assetsStore.setPlainList(plain);
    assetsStore.setPlainUtxos(plain?.[0]?.utxos || []);

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
  };

  // 将 watch 转换为 useEffect
  useEffect(() => {
    if (summaryQuery.data) {
      console.log('newData', summaryQuery.data.data);
      parseAssetSummary();
      console.log('allAssetList', allAssetList);
      processAllUtxos(allAssetList.map((item) => item.key));
      assetsStore.setAssetList(summaryQuery.data?.data || []);
    }
  }, [summaryQuery.data]);

  useEffect(() => {
    updateStoreAssets(allAssetList);
  }, [allAssetList]);

  useEffect(() => {
    if (address && network && chain) {
      summaryQuery.refetch();
      nsQuery.refetch();
    }
  }, [address, network, chain]);

  /**
   * 刷新所有资产数据
   * @param {RefreshOptions} options - 刷新选项
   */
  const refreshL1Assets = async (options: RefreshOptions = {}) => {
    const {
      resetState = true,
      refreshNs = true,
      refreshSummary = true,
      refreshUtxos = true,
      clearCache = true,
    } = options;

    // 清除缓存
    if (clearCache) {
      if (refreshNs) {
        queryClient.invalidateQueries({
          queryKey: ['ns', chain, address, network],
        });
      }
      if (refreshSummary) {
        queryClient.invalidateQueries({
          queryKey: ['summary', chain, address, network],
        });
      }
    }

    // 重置状态
    if (resetState) {
      setAllAssetList([]);
    }

    // 创建一个 Promise 数组来收集所有需要等待的请求
    const refreshPromises: Promise<any>[] = [];

    // 刷新命名空间数据
    if (refreshNs) {
      refreshPromises.push(nsQuery.refetch());
    }

    // 刷新摘要数据
    if (refreshSummary) {
      const summaryPromise = summaryQuery.refetch();
      refreshPromises.push(summaryPromise);

      // 如果需要刷新 UTXO，等待摘要数据加载完成后处理
      if (refreshUtxos) {
        summaryPromise.then(async (result) => {
          if (result.data) {
            await parseAssetSummary();
            await processAllUtxos(allAssetList.map((item) => item.key));
          }
        });
      }
    }

    // 等待所有刷新操作完成
    await Promise.all(refreshPromises);
  };

  return {
    loading: useMemo(
      () => summaryQuery.isLoading || nsQuery.isLoading,
      [summaryQuery.isLoading, nsQuery.isLoading]
    ),
    refreshL1Assets,
  };
};
