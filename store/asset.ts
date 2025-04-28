import { create } from 'zustand'
import { clientApi } from '@/api'
import { parallel, tryit } from 'radash'
import { useReactWalletStore } from '@sat20/btc-connect/dist/react'

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
  utxos: AssetUtxoItem[];
  amount: number;
}

/**
 * UTXO 项目接口定义
 */
export interface AssetUtxoItem {
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
 * 资产类型选项接口
 */
interface AssetTypeOption {
  label: string;
  value: string;
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
 * 资产状态接口
 */
interface AssetState {
  // 状态
  loading: boolean;
  error: Error | null;

  // 原始数据
  rawAssetList: AssetItem[];

  // 分类资产列表
  assets: {
    ordx: AssetItem[];
    plain: AssetItem[];
    runes: AssetItem[];
    brc20: AssetItem[];
    ord: AssetItem[];
  };

  // UTXO 数据
  plainUtxos: AssetUtxoItem[];

  // 可用资产类型
  availableAssetTypes: AssetTypeOption[];

  // 查询数据
  summaryData: any;
  isSummaryLoading: boolean;

  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setRawAssetList: (list: AssetItem[]) => void;
  updateAssetsByProtocol: (protocol: string, assets: AssetItem[]) => void;
  setPlainUtxos: (utxos: AssetUtxoItem[]) => void;
  setAvailableAssetTypes: (types: AssetTypeOption[]) => void;
  setSummaryData: (data: any) => void;
  setIsSummaryLoading: (loading: boolean) => void;
  setAssets: (assets: AssetState['assets']) => void;

  // 业务方法
  loadSummaryData: () => Promise<any>;
  loadUtxoData: (assetKeys?: string[]) => Promise<AssetUtxoItem[][]>;
  refreshAssets: (options?: RefreshOptions) => Promise<boolean>;
  reset: () => void;
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
 * 资产状态管理
 */
export const useAssetStore = create<AssetState>((set, get) => {
  // 获取钱包地址和网络
  const { address } = useReactWalletStore.getState();
  console.log('address', address);
  return {
    // 初始状态
    loading: false,
    error: null,
    rawAssetList: [],
    assets: {
      ordx: [],
      plain: [],
      runes: [],
      brc20: [],
      ord: [],
    },
    plainUtxos: [],
    availableAssetTypes: [],
    summaryData: null,
    isSummaryLoading: false,

    // 基础 Actions
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setRawAssetList: (list) => set({ rawAssetList: list }),
    updateAssetsByProtocol: (protocol, assets) =>
      set((state) => ({
        assets: {
          ...state.assets,
          [protocol]: assets,
        },
      })),
    setPlainUtxos: (utxos) => set({ plainUtxos: utxos }),
    setAvailableAssetTypes: (types) => set({ availableAssetTypes: types }),
    setSummaryData: (data) => set({ summaryData: data }),
    setIsSummaryLoading: (loading) => set({ isSummaryLoading: loading }),
    setAssets: (assets) => set({ assets }),

    // 业务方法
    loadSummaryData: async () => {
      // console.log('loadSummaryData', address); // Keep or remove logging as needed
      const { address } = useReactWalletStore.getState(); // Get fresh address inside the action
      const state = get();

      try {
        if (!address) {
          console.warn('loadSummaryData: No address found.');
          return null; // Return null if no address
        }
        state.setIsSummaryLoading(true);
        const result = await clientApi.getAddressSummary(address);
        // Update summary data regardless of processing result.data
        state.setSummaryData(result);

        if (result?.data) {
          const apiAssets = result.data || [];
          const newAssetList: AssetItem[] = [];
          // console.log('apiAssets', apiAssets);

          for (let i = 0; i < apiAssets.length; i++) {
            const item = apiAssets[i];
            // Use 'plain' as default protocol if item.Name.Protocol is empty or null
            const protocol = item.Name.Protocol || 'plain';
            const key = protocol !== 'plain'
              ? `${item.Name.Protocol}:${item.Name.Type}:${item.Name.Ticker}`
              : '::'; // Use specific key for plain BTC

            // Check if asset with this key already exists in the current rawAssetList
            if (!state.rawAssetList.find((v) => v?.key === key)) {
              let label = item.Name.Ticker;
              console.log('key', key);
              if (key !== '::') {
                try {
                  const infoRes = await window.sat20.getTickerInfo(key)
                  console.log('infoRes', infoRes);
                  
                  if (infoRes?.ticker) {
                    const { ticker } = infoRes
                    const result = JSON.parse(ticker)
                    console.log('ticker result', result)
                    label = result?.displayname || label
                  }
                } catch (error) {
                  console.error('error', error)
                }
              }
              console.log('label', label);
              
              newAssetList.push({
                id: key,
                key,
                protocol: protocol === 'plain' ? '' : item.Name.Protocol, // Store empty string for plain
                type: item.Name.Type,
                label, // Label BTC correctly
                ticker: item.Name.Ticker,
                utxos: [],
                amount: Number(item.Amount),
              });
            } else {
              // Optional: Update existing asset amount if needed? 
              // This depends on whether the summary API guarantees uniqueness or if amounts can change.
              // For now, we only add new assets based on key.
            }
          };

          if (newAssetList.length > 0) {
            const updatedRawAssetList = [...state.rawAssetList, ...newAssetList];

            // Rebuild the entire assets object based on the updated raw list
            const updatedAssets: AssetState['assets'] = {
              ordx: [],
              plain: [],
              runes: [],
              brc20: [],
              ord: [],
            };

            updatedRawAssetList.forEach(asset => {
              const protocolKey = asset.protocol || 'plain'; // Map empty protocol to 'plain' key
              if (updatedAssets[protocolKey as keyof typeof updatedAssets]) {
                updatedAssets[protocolKey as keyof typeof updatedAssets].push(asset);
              } else {
                // Handle unexpected protocols if necessary, though current structure covers known ones
                console.warn(`Unknown protocol found for asset key ${asset.key}: ${asset.protocol}`);
              }
            });

            // Recalculate available asset types based on the updated raw list
            const updatedAvailableAssetTypes = [
              ...(updatedRawAssetList.some(item => !item.protocol) ? [{ label: 'BTC', value: 'btc' }] : []), // Check for empty protocol
              ...(updatedRawAssetList.some(item => item.protocol === 'ordx') ? [{ label: 'SAT20', value: 'ordx' }] : []),
              ...(updatedRawAssetList.some(item => item.protocol === 'runes') ? [{ label: 'Runes', value: 'runes' }] : []),
              // Add other protocols like brc20, ord if needed
            ];

            // Update state once with all changes
            set({
              rawAssetList: updatedRawAssetList,
              assets: updatedAssets,
              availableAssetTypes: updatedAvailableAssetTypes,
            });
            console.log('updatedRawAssetList', updatedAssets);
            
          }
        } else {
          // Handle case where result exists but result.data is null/empty
          // Potentially clear assets if API returns empty data? Or just update summaryData?
          // Current logic updates summaryData and does nothing else, which seems reasonable.
        }

        return result; // Return the original API result
      } catch (err) {
        console.error('Failed to load summary data:', err);
        state.setError(err instanceof Error ? err : new Error('Failed to load summary data'));
        return null; // Return null on error
      } finally {
        state.setIsSummaryLoading(false);
      }
    },

    loadUtxoData: async (assetKeys?: string[]) => {
      const { address } = useReactWalletStore.getState(); // Get fresh address
      const state = get();
      try {
        if (!address) {
          console.warn('loadUtxoData: No address found.');
          return [];
        }
        state.setLoading(true);
        // Use provided keys or keys from the *current* rawAssetList
        const keysToFetch = assetKeys || state.rawAssetList.map(item => item.key).filter(key => key !== 'plain::'); // Exclude plain BTC key if needed

        if (keysToFetch.length === 0) {
          console.log("No asset keys found to fetch UTXOs for.");
          // If only plain BTC exists, maybe fetch plain UTXOs separately?
          // Or handle plain UTXOs differently as they don't have a specific 'key' in the same sense.
          // Current `processAllUtxos` might fail if passed 'plain::'.
          // Let's assume plain UTXOs are handled elsewhere or need specific logic.
          // For now, return early if only plain BTC or no keys.
          state.setLoading(false);
          return [];
        }

        const utxoResults = await processAllUtxos(address, keysToFetch);

        // --- Start: Update UTXOs in rawAssetList and categorized assets ---
        const updatedRawAssetList = state.rawAssetList.map((asset) => {
          const keyIndex = keysToFetch.indexOf(asset.key);
          if (keyIndex !== -1 && utxoResults[keyIndex]) {
            return { ...asset, utxos: utxoResults[keyIndex] };
          }
          return asset; // Return unchanged asset if no UTXOs fetched for it
        });

        // Rebuild the assets object similar to loadSummaryData
        const updatedAssets: AssetState['assets'] = {
          ordx: [],
          plain: [],
          runes: [],
          brc20: [],
          ord: [],
        };

        updatedRawAssetList.forEach(asset => {
          const protocolKey = asset.protocol || 'plain';
          if (updatedAssets[protocolKey as keyof typeof updatedAssets]) {
            updatedAssets[protocolKey as keyof typeof updatedAssets].push(asset);
          }
        });

        // Find plain UTXOs if they are part of the result (unlikely with current key structure)
        // This part needs clarification: How are plain BTC UTXOs fetched and identified?
        // Assuming plain UTXOs might be handled by a different API call or logic.
        // const plainUtxos = updatedRawAssetList.find(item => item.key === 'plain::')?.utxos || [];

        set({
          rawAssetList: updatedRawAssetList,
          assets: updatedAssets,
          // plainUtxos: plainUtxos, // Update plainUtxos if logic is added
        });
        // --- End: Update UTXOs ---

        // Return the fetched UTXO arrays directly
        return utxoResults;
      } catch (err) {
        console.error('Failed to load UTXO data:', err);
        state.setError(err instanceof Error ? err : new Error('Failed to load UTXO data'));
        return [];
      } finally {
        state.setLoading(false);
      }
    },

    refreshAssets: async (options: RefreshOptions = {}) => {
      const state = get();
      const {
        resetState = true,
        refreshSummary = true,
        clearCache = true,
      } = options;

      try {
        if (resetState) {
          set({
            rawAssetList: [],
            assets: {
              ordx: [],
              plain: [],
              runes: [],
              brc20: [],
              ord: [],
            },
            plainUtxos: [],
            availableAssetTypes: [],
            summaryData: null,
          });
        }

        if (refreshSummary) {
          await state.loadSummaryData();
        }

        return true;
      } catch (err) {
        state.setError(err instanceof Error ? err : new Error('Failed to refresh assets'));
        return false;
      }
    },

    reset: () => set({
      loading: false,
      error: null,
      rawAssetList: [],
      assets: {
        ordx: [],
        plain: [],
        runes: [],
        brc20: [],
        ord: [],
      },
      plainUtxos: [],
      availableAssetTypes: [],
      summaryData: null,
      isSummaryLoading: false,
    }),
  };
});

// 导出选择器
export const selectAssetsByProtocol = (protocol: string) =>
  (state: AssetState) => state.assets[protocol as keyof typeof state.assets];

export const selectPlainBalance = (state: AssetState) =>
  state.assets.plain.reduce((acc, item) => acc + Number(item.amount), 0);
