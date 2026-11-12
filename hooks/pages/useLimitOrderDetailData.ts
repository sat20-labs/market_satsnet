import { marketDetail } from "@/api/marketView";
import { useQuery } from "@tanstack/react-query";
import { clientApi } from "@/api";
import { contractService } from "@/domain/services/contract";
import { getConfiguredNetwork, useCommonStore, useWalletStore } from "@/store";
import { useAssetBalance } from '@/application/useAssetBalanceService';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";

export const useLimitOrderDetailData = (asset: string, initialContractUrl?: string, showAnalytics = false) => {
  const { network: stored } = useCommonStore();
  const network = getConfiguredNetwork() ?? stored;
  const ticker = asset.split(':')[2];
  const { address } = useReactWalletStore();
  const tickerQuery = useQuery<any>({
    queryKey: ['ticker', asset, network],
    queryFn: () => clientApi.getTickerInfo(asset),
    enabled: !!asset,
  });

  const holdersQuery = useQuery<any>({
    queryKey: ['ticker', 'holders', asset, network],
    queryFn: () => clientApi.getTickerHolders(asset, 1, 1),
    enabled: !!asset,
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    refetchOnWindowFocus: false,
  });

  const detail = useQuery({
    queryKey: ['marketDetail', 'swap', asset, initialContractUrl, network],
    queryFn: () => marketDetail('swap', asset, initialContractUrl),
    enabled: !!asset, staleTime: 10_000, refetchInterval: 15_000,
    refetchOnWindowFocus: false, refetchIntervalInBackground: false,
  });
  const contractUrl = detail.data?.contractURL;

  const { data: analytics, isLoading: isAnalyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["swap", 'analytics', contractUrl, network],
    queryFn: () => contractService.getContractAnalytics(contractUrl),
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    enabled: !!contractUrl && showAnalytics,
    refetchOnWindowFocus: false,
  });

  const isLoading = detail.isLoading;

  const { balance: satsBalance, getBalance } = useWalletStore();
  const { balance: assetBalance, refetch: refreshAssetBalance } = useAssetBalance(address, asset);

  const refresh = async () => {
    detail.refetch();
    if (showAnalytics && contractUrl) refetchAnalytics();
    getBalance();
    refreshAssetBalance();
  }
  return {
    ticker,
    isTickerLoading: tickerQuery.isLoading,
    isContractStatusLoading: detail.isLoading,
    loadError: detail.error,
    isAnalyticsLoading,
    tickerInfo: tickerQuery.data?.data || {},
    isLoading,
    contractUrl,
    contractData: detail.data,
    satsBalance,
    assetBalance,
    analyticsData: analytics,
    holders: holdersQuery.data?.data || {},
    refresh
  }
};