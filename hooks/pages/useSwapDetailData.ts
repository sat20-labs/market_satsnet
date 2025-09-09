import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientApi, marketApi } from "@/api";
import { contractService } from "@/domain/services/contract";
import { getContractStatusByAddress } from "@/api/market";
import { useMemo } from "react";
import { useCommonStore, useWalletStore } from "@/store";
import { useAssetBalance } from '@/application/useAssetBalanceService';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";

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

export const useSwapDetailData = (asset: string) => {
  console.log('asset', asset);
  const { network } = useCommonStore();

  const ticker = asset.split(':')[2];
  console.log('swap ticker', ticker);

  const { address } = useReactWalletStore();
  const tickerQuery = useQuery<any>({
    queryKey: ['ticker', asset, network],
    queryFn: () => clientApi.getTickerInfo(asset),
    enabled: !!asset,
  });
  const holdersQuery = useQuery<any>({
    queryKey: ['ticker', 'holders', asset, network],
    queryFn: () => clientApi.getTickerHolders(asset, 1, 10),
    enabled: !!asset,
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    refetchOnWindowFocus: false,
  });

  const contractUrlQuery = useQuery({
    queryKey: ['contractUrl', network],
    queryFn: () => contractService.getDeployedContractInfo(),
    enabled: !!ticker,
  });
  const contractUrl = useMemo(() => {
    return contractUrlQuery.data?.filter((url: string) => url.indexOf(`${ticker}_amm.tc`) > -1)[0];
  }, [contractUrlQuery.data, ticker]);

  const { data: swapStatus, isPending: isSwapStatusPending, isLoading: isSwapStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["amm", 'status', contractUrl, network],
    queryFn: () => contractService.getContractStatus(contractUrl),
    refetchInterval: 15000, // 增加到15秒，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    enabled: !!contractUrl,
    refetchOnWindowFocus: false,
  });

  const { data: analytics, isPending: isAnalyticsPending, isLoading: isAnalyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["amm", 'analytics', contractUrl, network],
    queryFn: () => contractService.getContractAnalytics(contractUrl),
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    enabled: !!contractUrl,
    refetchOnWindowFocus: false,
  });

  // 获取用户合约状态（包含 lptAmt）
  const { data: userContractStatus, isPending: isUserContractStatusPending, isLoading: isUserContractStatusLoading, refetch: refetchUserContractStatus } = useQuery({
    queryKey: ["amm", 'userStatus', contractUrl, address, network],
    queryFn: () => getContractStatusByAddress(contractUrl, address),
    refetchInterval: 15000, // 15秒刷新一次
    refetchIntervalInBackground: false, // 禁止后台刷新
    enabled: !!contractUrl && !!address,
    refetchOnWindowFocus: false,
  });

  console.log('analytics', analytics);
  console.log('tickerQuery', tickerQuery);
  console.log('isSwapStatusPending', isSwapStatusPending);
  console.log('isAnalyticsPending', isAnalyticsPending);
  console.log('userContractStatus', userContractStatus);
  
  // 只有在有 address 时才考虑 userContractStatus 的 loading 状态
  const isLoading = tickerQuery.isPending || isSwapStatusPending || isAnalyticsPending || (address && isUserContractStatusPending);


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
  const lptAmt = useMemo(() => {
    if (!userContractStatus?.status) return null;
    try {
      const parsedStatus = JSON.parse(userContractStatus.status);
      return parsedStatus?.LptAmt || null;
    } catch (error) {
      console.error('Failed to parse user contract status:', error);
      return null;
    }
  }, [userContractStatus]);

  // 解析用户合约状态中的操作历史记录
  const userOperationHistory = useMemo(() => {
    if (!userContractStatus?.status) return null;
    try {
      const parsedStatus = JSON.parse(userContractStatus.status);
      return {
        addLiq: parsedStatus?.addLiq || null,
        removeLiq: parsedStatus?.removeLiq || null,
        stake: parsedStatus?.stake || null,
        unstake: parsedStatus?.unstake || null,
        deposit: parsedStatus?.deposit || null,
        withdraw: parsedStatus?.withdraw || null,
        onList: parsedStatus?.onList || null,
        refund: parsedStatus?.refund || null,
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