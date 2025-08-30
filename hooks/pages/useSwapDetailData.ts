import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientApi, marketApi } from "@/api";
import { contractService } from "@/domain/services/contract";
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
  // const holdersQuery = useQuery<any>({
  //   queryKey: ['ticker', 'holders', asset, network],
  //   queryFn: () => clientApi.getTickerHolders(asset, 1, 10),
  //   enabled: !!asset,
  //   refetchInterval: 120000, // 增加到2分钟，减少刷新频率
  //   refetchIntervalInBackground: false, // 禁止后台刷新
  //   refetchOnWindowFocus: false,
  // });

  const contractUrlQuery = useQuery({
    queryKey: ['contractUrl', network],
    queryFn: () => contractService.getDeployedContractInfo(),
    enabled: !!ticker,
  });
  const contractUrl = useMemo(() => {
    return contractUrlQuery.data?.filter((url: string) => url.indexOf(`${ticker}_amm.tc`) > -1)[0];
  }, [contractUrlQuery.data, ticker]);

  const { data: swapStatus, isPending: isSwapStatusPending, isLoading: isSwapStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["swap", 'status', contractUrl, network],
    queryFn: () => contractService.getContractStatus(contractUrl),
    refetchInterval: 15000, // 增加到15秒，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    enabled: !!contractUrl,
    refetchOnWindowFocus: false,
  });

  const { data: analytics, isPending: isAnalyticsPending, isLoading: isAnalyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["swap", 'analytics', contractUrl, network],
    queryFn: () => contractService.getContractAnalytics(contractUrl),
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    enabled: !!contractUrl,
    refetchOnWindowFocus: false,
  });

  console.log('analytics', analytics);
  console.log('tickerQuery', tickerQuery);
  console.log('isSwapStatusPending', isSwapStatusPending);
  console.log('isAnalyticsPending', isAnalyticsPending);
  console.log('contractUrl', contractUrl);
  console.log('contractUrlQuery.data', contractUrlQuery.data);
  console.log('ticker', ticker);
  
  // 修复isLoading逻辑：只有在查询enabled时才检查pending状态
  const isLoading = 
    tickerQuery.isPending || 
    (!!contractUrl && isSwapStatusPending) || 
    (!!contractUrl && isAnalyticsPending);

  // 添加调试信息
  console.log('Loading states:', {
    tickerQueryPending: tickerQuery.isPending,
    contractUrlExists: !!contractUrl,
    swapStatusPending: isSwapStatusPending,
    analyticsPending: isAnalyticsPending,
    finalIsLoading: isLoading
  });


  const { balance: satsBalance, getBalance } = useWalletStore();
  const { balance: assetBalance, refetch: refreshAssetBalance } = useAssetBalance(address, asset);

  // 分别导出不同的刷新函数
  const refreshSwapStatus = () => {
    refetchStatus();
  };

  const refreshAnalytics = () => {
    refetchAnalytics();
  };

  const refreshBalances = () => {
    getBalance();
    refreshAssetBalance();
  };

  // 刷新所有数据
  const refreshAll = () => {
    refreshSwapStatus();
    // refreshAnalytics();
    refreshBalances();
  };

  return {
    ticker,
    isTickerLoading: tickerQuery.isLoading,
    isSwapStatusLoading,
    isAnalyticsLoading,
    tickerInfo: tickerQuery.data?.data || {},
    holders: {},
    isLoading,
    contractUrl,
    swapData: swapStatus,
    satsBalance,
    assetBalance,
    analyticsData: analytics,
    // 导出各种刷新函数
    refreshSwapStatus,
    refreshAnalytics,
    refreshBalances,
    refreshAll,
    // 添加调试信息
    debug: {
      asset,
      ticker,
      contractUrl,
      contractUrlQueryData: contractUrlQuery.data,
      tickerQueryPending: tickerQuery.isPending,
      swapStatusPending: isSwapStatusPending,
      analyticsPending: isAnalyticsPending,
      isLoading
    }
  }
};