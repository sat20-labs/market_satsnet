import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientApi, marketApi } from "@/api";
import { contractService } from "@/domain/services/contract";
import { useMemo } from "react";
import { useWalletStore } from "@/store";
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
  const queryClient = useQueryClient();

  const ticker = asset.split(':')[2];
  console.log('swap ticker', ticker);

  const { address } = useReactWalletStore();
  const tickerQuery = useQuery<any>({
    queryKey: ['ticker', asset],
    queryFn: () => clientApi.getTickerInfo(asset),
    enabled: !!asset,
  });

  const contractUrlQuery = useQuery({
    queryKey: ['contractUrl'],
    queryFn: () => contractService.getDeployedContractInfo(),
    enabled: !!ticker,
  });
  const contractUrl = useMemo(() => {
    return contractUrlQuery.data?.filter((url: string) => url.indexOf(`${ticker}_amm.tc`) > -1)[0];
  }, [contractUrlQuery.data, ticker]);

  const { data: swapStatus, isLoading: isSwapStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["swap", 'status', contractUrl],
    queryFn: () => contractService.getContractStatus(contractUrl),
    refetchInterval: 6000,
    enabled: !!contractUrl,
    refetchOnWindowFocus: false,
  });

  const { data: analytics, isLoading: isAnalyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["swap", 'analytics', contractUrl],
    queryFn: () => contractService.getContractAnalytics(contractUrl),
    refetchInterval: 60000,
    enabled: !!contractUrl,
    refetchOnWindowFocus: false,
  });

  const isLoading = tickerQuery.isLoading || isSwapStatusLoading || isAnalyticsLoading;

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
    refreshAll
  }
};