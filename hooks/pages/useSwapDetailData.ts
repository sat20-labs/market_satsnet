import { marketDetail } from "@/api/marketView";
import { useQuery } from "@tanstack/react-query";
import { clientApi } from "@/api";
import { contractService } from "@/domain/services/contract";
import { getContractStatusByAddress } from "@/api/market";
import { useMemo } from "react";
import { getConfiguredNetwork, useCommonStore, useWalletStore } from "@/store";
import { useAssetBalance } from '@/application/useAssetBalanceService';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { LptAmount, ParsedContractStatus } from "@/types";


export const useSwapDetailData = (asset: string, initialContractUrl?: string, showAnalytics = false) => {
  console.log('asset', asset);
  const { network } = useCommonStore();
  const effectiveNetwork = getConfiguredNetwork() ?? network;

  // ticker 仅用于展示；合约匹配必须基于完整 asset，避免 ordxordi 误命中 ordi
  const ticker = useMemo(() => asset?.split(':')?.[2] ?? '', [asset]);
  console.log('swap ticker', ticker);

  const { address } = useReactWalletStore();
  const tickerQuery = useQuery<any>({
    queryKey: ['ticker', asset, effectiveNetwork],
    queryFn: () => clientApi.getTickerInfo(asset),
    enabled: !!asset,
  });
  const holdersQuery = useQuery<any>({
    queryKey: ['ticker', 'holders', asset, effectiveNetwork],
    queryFn: () => clientApi.getTickerHolders(asset, 1, 1),
    enabled: !!asset,
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    refetchOnWindowFocus: false,
  });

  const detail = useQuery({
    queryKey: ['marketDetail', 'amm', asset, initialContractUrl, effectiveNetwork],
    queryFn: () => marketDetail('amm', asset, initialContractUrl),
    enabled: !!asset, staleTime: 10_000, refetchInterval: 15_000,
    refetchOnWindowFocus: false, refetchIntervalInBackground: false,
  });
  const contractUrl = detail.data?.contractURL;

  const { data: analytics, isLoading: isAnalyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["amm", 'analytics', contractUrl, effectiveNetwork],
    queryFn: () => contractService.getContractAnalytics(contractUrl!),
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    enabled: !!contractUrl && showAnalytics,
    refetchOnWindowFocus: false,
  });

  // 获取用户合约状态（包含 lptAmt）- 只在测试网环境下启用
  const { data: userContractStatus, isPending: isUserContractStatusPending, isLoading: isUserContractStatusLoading, refetch: refetchUserContractStatus } = useQuery({
    queryKey: ["amm", 'userStatus', contractUrl, address, effectiveNetwork],
    queryFn: () => getContractStatusByAddress(contractUrl!, address),
    refetchInterval: 15000, // 15秒刷新一次
    refetchIntervalInBackground: false, // 禁止后台刷新
    enabled: !!contractUrl && !!address,
    refetchOnWindowFocus: false,
  });
  const isLoading = detail.isLoading;

  const { balance: satsBalance, getBalance } = useWalletStore();
  const { balance: assetBalance, refetch: refreshAssetBalance } = useAssetBalance(address, asset);

  // 分别导出不同的刷新函数
  const refreshSwapStatus = () => {
    detail.refetch();
  };

  const refreshAnalytics = () => {
    refetchAnalytics();
  };

  const refreshUserContractStatus = () => {
    if (address) {
      refetchUserContractStatus();
    }
  };

  const refreshBalances = () => {
    getBalance();
    refreshAssetBalance();
  };

  // 刷新所有数据
  const refreshAll = () => {
    refreshSwapStatus();
    refreshUserContractStatus();
    // refreshAnalytics();
    refreshBalances();
  };

  // 解析用户合约状态中的 lptAmt
  const lptAmt = useMemo((): LptAmount | null => {
    if (!userContractStatus?.status) return null;
    try {
      const parsedStatus = JSON.parse(userContractStatus.status);
console.log('parsedStatus', parsedStatus)
      const lptData = parsedStatus?.status?.LptAmt;
      
      // 验证 lptAmt 数据结构
      if (lptData && typeof lptData === 'object' &&
          (typeof lptData.Value === 'number' || typeof lptData.Value === 'string') &&
          typeof lptData.Precision === 'number') {
        return lptData as LptAmount;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to parse user contract status:', error);
      return null;
    }
  }, [userContractStatus]);
  
  // 解析用户合约状态中的操作历史记录
  const userOperationHistory = useMemo(() => {
    if (!userContractStatus?.status) return null;
    try {
      const parsedStatus: ParsedContractStatus = JSON.parse(userContractStatus.status);
      return {
        addLiq: parsedStatus?.addLiq || null,
        removeLiq: parsedStatus?.removeLiq || null,
        stake: parsedStatus?.stake || null,
        unstake: parsedStatus?.unstake || null,
        deposit: parsedStatus?.deposit || null,
        withdraw: parsedStatus?.withdraw || null,
        onList: parsedStatus?.onList || null,
        refund: parsedStatus?.refund || null,
        profit: parsedStatus?.profit || null,
      };
    } catch (error) {
      console.error('Failed to parse user operation history:', error);
      return null;
    }
  }, [userContractStatus]);

  return {
    ticker,
    isTickerLoading: tickerQuery.isLoading,
    isSwapStatusLoading: detail.isLoading,
    isAnalyticsLoading,
    isUserContractStatusLoading,
    tickerInfo: tickerQuery.data?.data || {},
    holders: holdersQuery.data?.data || {},
    isLoading,
    loadError: detail.error,
    contractUrl,
    swapData: detail.data,
    satsBalance,
    assetBalance,
    analyticsData: analytics,
    userContractStatus,
    lptAmt,
    userOperationHistory,
    // 导出各种刷新函数
    refreshSwapStatus,
    refreshAnalytics,
    refreshUserContractStatus,
    refreshBalances,
    refreshAll
  }
};
