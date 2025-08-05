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

export const useTranscendDetailData = (asset: string) => {
  const { network } = useCommonStore();
  const queryClient = useQueryClient();

  const ticker = asset.split(':')[2];
  console.log('transcend ticker', ticker);

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
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  const contractUrlQuery = useQuery({
    queryKey: ['contractUrl', network],
    queryFn: () => contractService.getDeployedContractInfo(),
    enabled: !!ticker,
  });
  const contractUrl = useMemo(() => {
    return contractUrlQuery.data?.filter((url: string) => url.indexOf(`${ticker}_transcend.tc`) > -1)[0];
  }, [contractUrlQuery.data, ticker]);

  const { data: transcendStatus, isPending: isTranscendStatusPending, isLoading: isTranscendStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["transcend", 'status', contractUrl, network],
    queryFn: () => contractService.getContractStatus(contractUrl),
    refetchInterval: 6000,
    enabled: !!contractUrl,
    refetchOnWindowFocus: false,
  });

  const { data: analytics, isPending: isAnalyticsPending, isLoading: isAnalyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["transcend", 'analytics', contractUrl, network],
    queryFn: () => contractService.getContractAnalytics(contractUrl),
    refetchInterval: 60000,
    enabled: !!contractUrl,
    refetchOnWindowFocus: false,
  });

  const isLoading = tickerQuery.isPending || isTranscendStatusPending || isAnalyticsPending;

  const { balance: satsBalance, getBalance } = useWalletStore();
  const { balance: assetBalance, refetch: refreshAssetBalance } = useAssetBalance(address, asset);

  // 分别导出不同的刷新函数
  const refreshTranscendStatus = () => {
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
    refreshTranscendStatus();
    // refreshAnalytics();
    refreshBalances();
  };

  return {
    ticker,
    isTickerLoading: tickerQuery.isLoading,
    isTranscendStatusLoading,
    isAnalyticsLoading,
    tickerInfo: tickerQuery.data?.data || {},
    holders: holdersQuery.data?.data || {},
    isLoading,
    contractUrl,
    transcendData: transcendStatus,
    satsBalance,
    assetBalance,
    analyticsData: analytics,
    // 导出各种刷新函数
    refreshTranscendStatus,
    refreshAnalytics,
    refreshBalances,
    refreshAll
  }
}; 