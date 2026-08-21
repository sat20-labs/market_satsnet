import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientApi, marketApi } from "@/api";
import { contractService } from "@/domain/services/contract";
import { getContractStatusByAddress } from "@/api/market";
import { useMemo } from "react";
import { getConfiguredNetwork, useCommonStore, useWalletStore } from "@/store";
import { useAssetBalance } from '@/application/useAssetBalanceService';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { LptAmount, UserContractStatus, ParsedContractStatus } from "@/types";
import { resolveSwapContractUrl } from "@/components/satoshinet/swap/swapContract";

interface TickerInfo {
  name: {
    Protocol: string;
    Type: string;
    Ticker: string;
  };
  displayname: string;
  id: number;
  selfmint: number;
  deployHeight: number;
  deployBlockTime: number;
  deployTx: string;
  limit: string;
  n: number;
  totalMinted: string;
  mintTimes: number;
  maxSupply: string;
  holdersCount: number;
}

export const useSwapDetailData = (asset: string, initialContractUrl?: string) => {
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
    queryFn: () => clientApi.getTickerHolders(asset, 1, 10),
    enabled: !!asset,
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    refetchOnWindowFocus: false,
  });

  // 查询参数中的 contractUrl 只是提示；始终用当前网络的部署列表验证。
  const contractUrlQuery = useQuery({
    queryKey: ['contractUrl', effectiveNetwork],
    queryFn: () => contractService.getDeployedContractInfo(),
    enabled: !!asset,
  });

  const contractUrl = useMemo(() => {
    const list: string[] = contractUrlQuery.data ?? [];
    return resolveSwapContractUrl(list, asset, initialContractUrl);
  }, [contractUrlQuery.data, asset, initialContractUrl]);

  const { data: swapStatus, isPending: isSwapStatusPending, isLoading: isSwapStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["amm", 'status', contractUrl, effectiveNetwork],
    queryFn: () => contractService.getContractStatus(contractUrl!),
    refetchInterval: 15000, // 增加到15秒，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    enabled: !!contractUrl,
    refetchOnWindowFocus: false,
  });

  const { data: analytics, isPending: isAnalyticsPending, isLoading: isAnalyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["amm", 'analytics', contractUrl, effectiveNetwork],
    queryFn: () => contractService.getContractAnalytics(contractUrl!),
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    enabled: !!contractUrl,
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
// console.log('analytics', analytics);
//   console.log('tickerQuery', tickerQuery);
//   console.log('isSwapStatusPending', isSwapStatusPending);
//   console.log('isAnalyticsPending', isAnalyticsPending);
//   console.log('userContractStatus', userContractStatus);
  

// console.log('analytics', analytics);
//   console.log('tickerQuery', tickerQuery);
//   console.log('isSwapStatusPending', isSwapStatusPending);
//   console.log('isAnalyticsPending', isAnalyticsPending);
//   console.log('userContractStatus', userContractStatus);
  
  // 只有在有 contractUrl 时才考虑 swapStatus 和 analytics 的 loading 状态
  // 只有在有 address 且在测试网时才考虑 userContractStatus 的 loading 状态
  const isLoading = tickerQuery.isPending || 
    (!!contractUrl && isSwapStatusPending) || 
    (!!contractUrl && isAnalyticsPending) || 
    (address && isUserContractStatusPending
  // 调试信息
  // console.log('Loading states:', {
  //   tickerQuery: tickerQuery.isPending,
  //   isSwapStatusPending,
  //   isAnalyticsPending,
  //   isUserContractStatusPending,
  //   address,
  //   network,
  //   ticker,
  //   contractUrl,
  //   contractUrlQueryData: contractUrlQuery.data,
  //   finalIsLoading: isLoading,
  //   initialContractUrl
  // });

);

  // 调试信息
  // console.log('Loading states:', {
  //   tickerQuery: tickerQuery.isPending,
  //   isSwapStatusPending,
  //   isAnalyticsPending,
  //   isUserContractStatusPending,
  //   address,
  //   network,
  //   ticker,
  //   contractUrl,
  //   contractUrlQueryData: contractUrlQuery.data,
  //   finalIsLoading: isLoading,
  //   initialContractUrl
  // });

  
  const { balance: satsBalance, getBalance } = useWalletStore();
  const { balance: assetBalance, refetch: refreshAssetBalance } = useAssetBalance(address, asset);

  // 分别导出不同的刷新函数
  const refreshSwapStatus = () => {
    refetchStatus();
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
    isSwapStatusLoading,
    isAnalyticsLoading,
    isUserContractStatusLoading,
    tickerInfo: tickerQuery.data?.data || {},
    holders: holdersQuery.data?.data || {},
    isLoading,
    contractUrl,
    swapData: swapStatus,
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
